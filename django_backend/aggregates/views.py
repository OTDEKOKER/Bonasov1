from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import Aggregate
from .serializers import AggregateSerializer


class AggregateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing aggregate data."""
    
    queryset = Aggregate.objects.all()
    serializer_class = AggregateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['indicator', 'project', 'organization']
    ordering_fields = ['period_start', 'period_end', 'created_at']
    ordering = ['-period_start']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Aggregate.objects.all()
        elif user.organization:
            return Aggregate.objects.filter(organization=user.organization)
        return Aggregate.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_indicator(self, request):
        """Get aggregates grouped by indicator."""
        indicator_id = request.query_params.get('indicator_id')
        if not indicator_id:
            return Response({'error': 'indicator_id required'}, status=400)
        
        aggregates = self.get_queryset().filter(indicator_id=indicator_id)
        return Response(AggregateSerializer(aggregates, many=True).data)
