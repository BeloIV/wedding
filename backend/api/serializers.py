from django.utils import timezone
from rest_framework import serializers
from .models import (
    WeddingInfo, Guest, BudgetCategory, BudgetItem,
    Task, Vendor, WishlistItem, Gallery, Photo,
    RSVPResponse, ProgramItem, Invitation, Table,
)


class WeddingInfoSerializer(serializers.ModelSerializer):
    dress_code_image_url = serializers.SerializerMethodField()

    class Meta:
        model = WeddingInfo
        fields = '__all__'

    def get_dress_code_image_url(self, obj):
        request = self.context.get('request')
        if obj.dress_code_image and request:
            return request.build_absolute_uri(obj.dress_code_image.url)
        return None

    def to_internal_value(self, data):
        import json
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        for field in ('wedding_date', 'ceremony_time', 'reception_time'):
            if data.get(field) == '':
                data[field] = None
        if isinstance(data.get('dress_code_colors'), str):
            try:
                data['dress_code_colors'] = json.loads(data['dress_code_colors'])
            except (ValueError, TypeError):
                data['dress_code_colors'] = []
        return super().to_internal_value(data)


class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = '__all__'


class BudgetItemSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default=None)

    class Meta:
        model = BudgetItem
        fields = '__all__'


class BudgetCategorySerializer(serializers.ModelSerializer):
    items = BudgetItemSerializer(many=True, read_only=True)
    total_planned = serializers.SerializerMethodField()
    total_actual = serializers.SerializerMethodField()

    class Meta:
        model = BudgetCategory
        fields = '__all__'

    def get_total_planned(self, obj):
        return float(sum(i.planned_amount for i in obj.items.all()))

    def get_total_actual(self, obj):
        return float(sum(i.actual_amount if i.actual_amount is not None else i.planned_amount for i in obj.items.all()))


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['completed_at']

    def validate(self, attrs):
        # completed_at follows the completed flag (set on completion, cleared on un-complete)
        if 'completed' in attrs:
            attrs['completed_at'] = timezone.now() if attrs['completed'] else None
        return attrs


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'


class WishlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WishlistItem
        fields = '__all__'


class PublicWishlistItemSerializer(serializers.ModelSerializer):
    """Guests only see whether a gift is taken, never who took it."""

    class Meta:
        model = WishlistItem
        exclude = ['reserved_by', 'reserved_at']


class PhotoSerializer(serializers.ModelSerializer):
    image_full_url = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'gallery', 'image', 'image_full_url', 'caption', 'uploaded_at']

    def get_image_full_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class GalleryListSerializer(serializers.ModelSerializer):
    photo_count = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Gallery
        fields = ['id', 'name', 'description', 'public', 'photo_count', 'cover_url', 'created_at']

    def get_photo_count(self, obj):
        return obj.photos.count()

    def get_cover_url(self, obj):
        request = self.context.get('request')
        photo = obj.photos.first()
        if photo and photo.image and request:
            return request.build_absolute_uri(photo.image.url)
        return None


class GallerySerializer(serializers.ModelSerializer):
    photos = PhotoSerializer(many=True, read_only=True)
    photo_count = serializers.SerializerMethodField()

    class Meta:
        model = Gallery
        fields = ['id', 'name', 'description', 'public', 'photo_count', 'photos', 'created_at']

    def get_photo_count(self, obj):
        return obj.photos.count()


class RSVPResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RSVPResponse
        fields = '__all__'
        read_only_fields = ['submitted_at']


class PublicRSVPSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, max_length=254)
    invite_token = serializers.CharField(max_length=5)
    guest_id = serializers.IntegerField(write_only=True)
    dietary_notes = serializers.CharField(max_length=500, required=False, allow_blank=True)
    message = serializers.CharField(max_length=2000, required=False, allow_blank=True)

    class Meta:
        model = RSVPResponse
        fields = ['guest_id', 'email', 'attending', 'dietary', 'dietary_notes', 'message', 'invite_token']


class InvitationSerializer(serializers.ModelSerializer):
    guest_names = serializers.SerializerMethodField()
    guest_first_names = serializers.SerializerMethodField()
    guest_count = serializers.IntegerField(source='guests.count', read_only=True)

    class Meta:
        model = Invitation
        fields = ['id', 'token', 'label', 'guest_names', 'guest_first_names', 'guest_count', 'created_at']
        read_only_fields = ['token', 'created_at']

    def get_guest_names(self, obj):
        return [f"{g.first_name} {g.last_name}" for g in obj.guests.all()]

    def get_guest_first_names(self, obj):
        return [g.first_name for g in obj.guests.all()]


class PublicInviteSerializer(serializers.ModelSerializer):
    names = serializers.SerializerMethodField()
    guests = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = ['token', 'names', 'guests']

    def get_names(self, obj):
        return [g.first_name for g in obj.guests.all()]

    def get_guests(self, obj):
        return [
            {
                'id': g.id,
                'first_name': g.first_name,
                'last_name': g.last_name,
            }
            for g in obj.guests.all()
        ]


class ProgramItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramItem
        fields = '__all__'


class TableSerializer(serializers.ModelSerializer):
    seated_count = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = [
            'id', 'name', 'capacity', 'shape', 'order', 'seated_count',
            'pos_x', 'pos_y', 'width', 'height', 'rotation', 'seat_layout', 'created_at',
        ]

    def get_seated_count(self, obj):
        count = 0
        for g in Guest.objects.filter(table_number=obj.id):
            count += 1
        return count
