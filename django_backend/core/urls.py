"""
URL configuration for BONASO Data Portal.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from projects.views import ProjectViewSet, TaskViewSet, DeadlineViewSet

manage_router = DefaultRouter()
manage_router.register('projects', ProjectViewSet, basename='manage-projects')
manage_router.register('tasks', TaskViewSet, basename='manage-tasks')
manage_router.register('deadlines', DeadlineViewSet, basename='manage-deadlines')

urlpatterns = [
    # Admin site
    path('admin/', admin.site.urls),

    # Users: authentication, current user, and management
    path('api/users/', include('users.urls')),  # handles auth, JWT, UserViewSet, etc.

    # Core apps
    path('api/organizations/', include('organizations.urls')),
    path('api/indicators/', include('indicators.urls')),

    # Projects & deadlines
    path('api/projects/', include('projects.urls')),  # new path
    path('api/manage/', include(manage_router.urls)),  # legacy frontend paths

    # Data collection apps
    path('api/record/', include('respondents.urls')),
    path('api/aggregates/', include('aggregates.urls')),
    path('api/activities/', include('events.urls')),
    path('api/social/', include('social.urls')),

    # Utility apps
    path('api/flags/', include('flags.urls')),
    path('api/analysis/', include('analysis.urls')),  # dashboard lives here
    path('api/profiles/', include('profiles.urls')),
    path('api/uploads/', include('uploads.urls')),
    path('api/messages/', include('messaging.urls')),
    path('api/manage/users/', include('djoser.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
