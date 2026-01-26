from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Count, Sum, Avg
from django.http import HttpResponse
import csv

from .models import Report, SavedQuery
from .serializers import ReportSerializer, SavedQuerySerializer


class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet for managing reports."""
    
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type', 'organization', 'is_public']
    search_fields = ['name', 'description']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Report.objects.all()
        return Report.objects.filter(
            models.Q(organization=user.organization) |
            models.Q(is_public=True) |
            models.Q(created_by=user)
        )
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Generate/refresh report data."""
        report = self.get_object()
        # Generate report logic here based on report_type and parameters
        report.last_generated = timezone.now()
        report.save()
        return Response(ReportSerializer(report).data)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download report as CSV."""
        report = self.get_object()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report.name}.csv"'
        
        writer = csv.writer(response)
        
        # Write cached data as CSV
        if report.cached_data and isinstance(report.cached_data, list):
            if report.cached_data:
                writer.writerow(report.cached_data[0].keys())
                for row in report.cached_data:
                    writer.writerow(row.values())
        
        return response


class SavedQueryViewSet(viewsets.ModelViewSet):
    """ViewSet for saved queries."""
    
    queryset = SavedQuery.objects.all()
    serializer_class = SavedQuerySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SavedQuery.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DashboardView(viewsets.ViewSet):
    """Dashboard analytics endpoints."""
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get dashboard overview stats."""
        from respondents.models import Respondent, Interaction
        from projects.models import Project
        from indicators.models import Indicator
        
        user = request.user
        
        # Build base querysets based on user role
        if user.role == 'admin':
            respondents = Respondent.objects.all()
            interactions = Interaction.objects.all()
            projects = Project.objects.all()
        elif user.organization:
            respondents = Respondent.objects.filter(organization=user.organization)
            interactions = Interaction.objects.filter(respondent__organization=user.organization)
            projects = Project.objects.filter(organizations=user.organization)
        else:
            respondents = Respondent.objects.none()
            interactions = Interaction.objects.none()
            projects = Project.objects.none()
        
        return Response({
            'total_respondents': respondents.count(),
            'total_assessments': interactions.count(),
            'active_projects': projects.filter(status='active').count(),
            'total_indicators': Indicator.objects.filter(is_active=True).count(),
            'indicators_behind': 0,  # Calculate based on project targets
            'recent_activity': [],
        })
