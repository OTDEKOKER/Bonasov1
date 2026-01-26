from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SocialServiceViewSet, ReferralViewSet

router = DefaultRouter()
router.register('services', SocialServiceViewSet, basename='social-services')
router.register('referrals', ReferralViewSet, basename='referrals')

urlpatterns = [
    path('', include(router.urls)),
]
