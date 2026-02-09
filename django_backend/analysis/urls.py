from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, SavedQueryViewSet, DashboardView

# Create a router and register our viewsets
router = DefaultRouter()
router.register('reports', ReportViewSet, basename='reports')
router.register('saved-queries', SavedQueryViewSet, basename='saved-queries')
router.register('dashboard', DashboardView, basename='dashboard')  # DashboardView as a ViewSet

# Include the router URLs in urlpatterns
urlpatterns = [
    path('', include(router.urls)),
]
