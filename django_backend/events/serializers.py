from rest_framework import serializers
from .models import Event, Participant


class ParticipantSerializer(serializers.ModelSerializer):
    """Serializer for Participant model."""
    
    respondent_name = serializers.CharField(source='respondent.full_name', read_only=True)
    
    class Meta:
        model = Participant
        fields = [
            'id', 'event', 'respondent', 'respondent_name',
            'name', 'gender', 'contact', 'attended', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class EventSerializer(serializers.ModelSerializer):
    """Serializer for Event model."""
    
    project_name = serializers.CharField(source='project.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    participants_count = serializers.SerializerMethodField()
    attendance_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'type', 'status',
            'project', 'project_name', 'organization', 'organization_name',
            'start_date', 'end_date', 'location',
            'expected_participants', 'actual_participants', 'participants_count',
            'attendance_rate', 'budget', 'actual_cost', 'indicators',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_participants_count(self, obj):
        return obj.participants.count()
    
    def get_attendance_rate(self, obj):
        if obj.expected_participants == 0:
            return 0
        return int((obj.actual_participants / obj.expected_participants) * 100)


class EventDetailSerializer(EventSerializer):
    """Detailed serializer with participants."""
    
    participants = ParticipantSerializer(many=True, read_only=True)
    
    class Meta(EventSerializer.Meta):
        fields = EventSerializer.Meta.fields + ['participants']
