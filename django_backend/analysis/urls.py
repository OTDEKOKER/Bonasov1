from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, SavedQueryViewSet, DashboardView

router = DefaultRouter()
router.register('reports', ReportViewSet, basename='reports')
router.register('saved-queries', SavedQueryViewSet, basename='saved-queries')
router.register('dashboard', DashboardView, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
