from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from users.accounts import ensure_admin, send_password_mail
from .models import (
    WeddingInfo, Guest, BudgetCategory, BudgetItem,
    Task, Vendor, WishlistItem, Gallery, Photo,
    RSVPResponse, ProgramItem, Invitation, Table,
)
from .serializers import (
    WeddingInfoSerializer, PublicWeddingInfoSerializer, GuestSerializer, BudgetCategorySerializer,
    BudgetItemSerializer, TaskSerializer, VendorSerializer,
    WishlistItemSerializer, GallerySerializer, GalleryListSerializer,
    PhotoSerializer, RSVPResponseSerializer, ProgramItemSerializer,
    InvitationSerializer, PublicInviteSerializer, PublicRSVPSerializer,
    PublicWishlistItemSerializer, TableSerializer,
)


class WeddingInfoView(generics.RetrieveUpdateAPIView):
    serializer_class = WeddingInfoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        # the couple's addresses automatically become full admins; new accounts get a password-setup mail
        info = self.get_object()
        accounts = []
        for who, email in (('groom', info.groom_email), ('bride', info.bride_email)):
            user, created = ensure_admin(email)
            if user is None:
                continue
            mailed = send_password_mail(user, new_account=True) if created else None
            accounts.append({'who': who, 'email': user.email, 'created': created, 'mail_sent': mailed})
        response.data['admin_accounts'] = accounts
        return response

    def get_object(self):
        obj, _ = WeddingInfo.objects.get_or_create(pk=1)
        return obj

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class GuestViewSet(viewsets.ModelViewSet):
    queryset = Guest.objects.all()
    serializer_class = GuestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _sync_couple(self, guest):
        """Ticking a guest as groom/bride: only one of each, the settings follow, the guest becomes a full admin."""
        if guest.couple_role not in ('groom', 'bride'):
            return None
        role = guest.couple_role
        Guest.objects.filter(couple_role=role).exclude(pk=guest.pk).update(couple_role='')
        info, _ = WeddingInfo.objects.get_or_create(pk=1)
        setattr(info, f'{role}_name', f'{guest.first_name} {guest.last_name}'.strip())
        if guest.email:
            setattr(info, f'{role}_email', guest.email)
        info.save()
        if not guest.email:
            return {'who': role, 'email': '', 'created': False, 'mail_sent': None, 'no_email': True}
        user, created = ensure_admin(guest.email)
        mailed = send_password_mail(user, new_account=True) if created else None
        return {'who': role, 'email': user.email, 'created': created, 'mail_sent': mailed}

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        account = self._sync_couple(Guest.objects.get(pk=response.data['id']))
        if account:
            response.data['admin_account'] = account
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        account = self._sync_couple(Guest.objects.get(pk=response.data['id']))
        if account:
            response.data['admin_account'] = account
        return response


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class BudgetItemViewSet(viewsets.ModelViewSet):
    queryset = BudgetItem.objects.all()
    serializer_class = BudgetItemSerializer
    permission_classes = [permissions.IsAuthenticated]


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]


class WishlistItemViewSet(viewsets.ModelViewSet):
    queryset = WishlistItem.objects.all()
    serializer_class = WishlistItemSerializer
    permission_classes = [permissions.IsAuthenticated]


class GalleryViewSet(viewsets.ModelViewSet):
    queryset = Gallery.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return GalleryListSerializer
        return GallerySerializer


class PhotoViewSet(viewsets.ModelViewSet):
    queryset = Photo.objects.all()
    serializer_class = PhotoSerializer
    permission_classes = [permissions.IsAuthenticated]


class RSVPResponseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RSVPResponse.objects.all()
    serializer_class = RSVPResponseSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProgramItemViewSet(viewsets.ModelViewSet):
    queryset = ProgramItem.objects.all()
    serializer_class = ProgramItemSerializer
    permission_classes = [permissions.IsAuthenticated]


class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all()
    serializer_class = TableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        with transaction.atomic():
            Guest.objects.filter(table_number=instance.id).update(table_number=None, seat=None)
            instance.delete()


# ── Public views ──────────────────────────────────────────

class PublicWeddingInfoView(generics.RetrieveAPIView):
    serializer_class = PublicWeddingInfoSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        obj, _ = WeddingInfo.objects.get_or_create(pk=1)
        return obj

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class PublicWishlistView(generics.ListAPIView):
    queryset = WishlistItem.objects.all()
    serializer_class = PublicWishlistItemSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


def _clean_token(value):
    """Invite token from a request body; anything that is not a short string is rejected."""
    if not isinstance(value, str):
        return ''
    return value.strip().upper()[:5]


class PublicWishlistReserveView(generics.GenericAPIView):
    queryset = WishlistItem.objects.all()
    serializer_class = PublicWishlistItemSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'reserve'

    def post(self, request, pk=None):
        token = _clean_token(request.data.get('invite_token') if hasattr(request.data, 'get') else None)
        inv = Invitation.objects.filter(token=token).first() if token else None
        if inv is None:
            return Response({'error': 'Neplatný kód pozvania.'}, status=status.HTTP_400_BAD_REQUEST)
        names = [g.first_name for g in inv.guests.all()]
        reserved_by = (' a '.join(names) if names else inv.token)[:200]

        with transaction.atomic():
            item = WishlistItem.objects.select_for_update().filter(pk=pk).first()
            if item is None:
                return Response({'error': 'Darček neexistuje.'}, status=status.HTTP_404_NOT_FOUND)
            if item.reserved:
                return Response({'error': 'Tento darček je už rezervovaný.'}, status=status.HTTP_400_BAD_REQUEST)
            item.reserved = True
            item.reserved_by = reserved_by
            item.reserved_at = timezone.now()
            item.save()
        return Response(PublicWishlistItemSerializer(item).data)


class PublicRSVPView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'rsvp'

    def post(self, request):
        if not hasattr(request.data, 'get'):
            return Response({'error': 'Neplatná požiadavka.'}, status=status.HTTP_400_BAD_REQUEST)
        token = _clean_token(request.data.get('invite_token'))
        invitation = Invitation.objects.filter(token=token).first() if token else None
        if invitation is None:
            return Response({'error': 'Neplatný kód pozvania.'}, status=status.HTTP_400_BAD_REQUEST)

        s = PublicRSVPSerializer(data={**request.data.dict(), 'invite_token': token}
                                 if hasattr(request.data, 'dict') else {**request.data, 'invite_token': token})
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        data = dict(s.validated_data)

        guest = invitation.guests.filter(pk=data.pop('guest_id')).first()
        if guest is None:
            return Response({'error': 'Hosť nepatrí k tejto pozvánke.'}, status=status.HTTP_400_BAD_REQUEST)

        guest_name = f"{guest.first_name} {guest.last_name}".strip()
        with transaction.atomic():
            # one answer per guest and invitation: resubmitting (e.g. after a failed retry) updates it
            RSVPResponse.objects.update_or_create(
                invite_token=token, guest_name=guest_name,
                defaults={k: v for k, v in data.items() if k != 'invite_token'},
            )
            guest.rsvp_status = Guest.RSVP_CONFIRMED if data['attending'] else Guest.RSVP_DECLINED
            guest.save(update_fields=['rsvp_status'])

        return Response({'ok': True})


class PublicGalleryListView(generics.ListAPIView):
    queryset = Gallery.objects.filter(public=True)
    serializer_class = GalleryListSerializer
    permission_classes = [permissions.AllowAny]


class PublicGalleryDetailView(generics.RetrieveAPIView):
    queryset = Gallery.objects.filter(public=True)
    serializer_class = GallerySerializer
    permission_classes = [permissions.AllowAny]


class PublicProgramView(generics.ListAPIView):
    queryset = ProgramItem.objects.all()
    serializer_class = ProgramItemSerializer
    permission_classes = [permissions.AllowAny]


class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]


class PublicInviteView(generics.RetrieveAPIView):
    queryset = Invitation.objects.all()
    serializer_class = PublicInviteSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'token'
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'invite'
