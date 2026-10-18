from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .accounts import send_password_mail
from .serializers import UserSerializer


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    """Always answers 200, so it cannot be used to find out which addresses have an account."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'pwreset'

    def post(self, request):
        email = request.data.get('email') if hasattr(request.data, 'get') else None
        if isinstance(email, str) and email.strip():
            user = get_user_model().objects.filter(email__iexact=email.strip(), is_active=True).first()
            if user:
                send_password_mail(user)
        return Response({'ok': True})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        data = request.data if hasattr(request.data, 'get') else {}
        uid, token, password = data.get('uid'), data.get('token'), data.get('password')
        bad = Response({'error': 'Odkaz je neplatný alebo vypršal. Vyžiadajte si nový.'}, status=status.HTTP_400_BAD_REQUEST)
        if not all(isinstance(v, str) and v for v in (uid, token, password)):
            return bad
        try:
            user = get_user_model().objects.get(pk=force_str(urlsafe_base64_decode(uid)), is_active=True)
        except (ValueError, TypeError, OverflowError, get_user_model().DoesNotExist):
            return bad
        if not default_token_generator.check_token(user, token):
            return bad
        try:
            validate_password(password, user)
        except ValidationError as e:
            return Response({'password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=['password'])
        return Response({'ok': True})
