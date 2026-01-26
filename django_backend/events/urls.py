from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, ParticipantViewSet

router = DefaultRouter()
router.register('participants', ParticipantViewSet, basename='participants')
router.register('', EventViewSet, basename='events')

urlpatterns = [
    path('', include(router.urls)),
]
