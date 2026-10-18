from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('guests', views.GuestViewSet)
router.register('invitations', views.InvitationViewSet)
router.register('budget/categories', views.BudgetCategoryViewSet)
router.register('budget/items', views.BudgetItemViewSet)
router.register('tasks', views.TaskViewSet)
router.register('vendors', views.VendorViewSet)
router.register('wishlist', views.WishlistItemViewSet)
router.register('galleries', views.GalleryViewSet)
router.register('photos', views.PhotoViewSet)
router.register('rsvp-responses', views.RSVPResponseViewSet)
router.register('program', views.ProgramItemViewSet)
router.register('tables', views.TableViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('wedding-info/', views.WeddingInfoView.as_view()),
    path('public/wedding-info/', views.PublicWeddingInfoView.as_view()),
    path('public/wishlist/', views.PublicWishlistView.as_view()),
    path('public/wishlist/<int:pk>/reserve/', views.PublicWishlistReserveView.as_view()),
    path('public/rsvp/', views.PublicRSVPView.as_view()),
    path('public/galleries/', views.PublicGalleryListView.as_view()),
    path('public/galleries/<int:pk>/', views.PublicGalleryDetailView.as_view()),
    path('public/program/', views.PublicProgramView.as_view()),
    path('public/invite/<str:token>/', views.PublicInviteView.as_view()),
]
