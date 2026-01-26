from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone

from .models import SocialService, Referral
from .serializers import SocialServiceSerializer, ReferralSerializer


class SocialServiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing social services."""
    
    queryset = SocialService.objects.all()
    serializer_class = SocialServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['respondent', 'service_type', 'status']
    search_fields = ['service_type', 'description', 'provider']
    ordering = ['-start_date']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return SocialService.objects.all()
        elif user.organization:
            return SocialService.objects.filter(respondent__organization=user.organization)
        return SocialService.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ReferralViewSet(viewsets.ModelViewSet):
    """ViewSet for managing referrals."""
    
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['respondent', 'from_organization', 'to_organization', 'status']
    search_fields = ['reason', 'notes']
    ordering = ['-referred_date']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Referral.objects.all()
        elif user.organization:
            return Referral.objects.filter(
                models.Q(from_organization=user.organization) |
                models.Q(to_organization=user.organization)
            )
        return Referral.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a referral."""
        referral = self.get_object()
        referral.status = 'accepted'
        referral.save()
        return Response(ReferralSerializer(referral).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete a referral."""
        referral = self.get_object()
        referral.status = 'completed'
        referral.completed_date = timezone.now().date()
        referral.save()
        return Response(ReferralSerializer(referral).data)
