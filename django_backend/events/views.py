from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Event, Participant
from .serializers import EventSerializer, EventDetailSerializer, ParticipantSerializer


class EventViewSet(viewsets.ModelViewSet):
    """ViewSet for managing events/activities."""
    
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'status', 'project', 'organization']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_date', 'created_at', 'title']
    ordering = ['-start_date']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventDetailSerializer
        return EventSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Event.objects.all()
        elif user.organization:
            return Event.objects.filter(organization=user.organization)
        return Event.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        """Add participant to event."""
        event = self.get_object()
        serializer = ParticipantSerializer(data={
            'event': event.id,
            **request.data
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Update actual participants count
        event.actual_participants = event.participants.filter(attended=True).count()
        event.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark event as completed."""
        event = self.get_object()
        event.status = 'completed'
        event.actual_participants = event.participants.filter(attended=True).count()
        event.save()
        return Response(EventSerializer(event).data)


class ParticipantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing participants."""
    
    queryset = Participant.objects.all()
    serializer_class = ParticipantSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event', 'attended']
