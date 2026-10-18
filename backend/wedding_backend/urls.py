from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users.views import MeView

class ThrottledLoginView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class ThrottledRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/auth/login/', ThrottledLoginView.as_view()),
    path('api/auth/refresh/', ThrottledRefreshView.as_view()),
    path('api/auth/me/', MeView.as_view()),
    path('api/', include('api.urls')),
]

# dev only: in production nginx serves /media/ and /static/ (static() is a no-op when DEBUG is off)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
