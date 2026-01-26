from rest_framework import serializers
from .models import SocialService, Referral


class SocialServiceSerializer(serializers.ModelSerializer):
    """Serializer for SocialService model."""
    
    respondent_name = serializers.CharField(source='respondent.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = SocialService
        fields = [
            'id', 'respondent', 'respondent_name', 'service_type',
            'description', 'provider', 'start_date', 'end_date', 'status',
            'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class ReferralSerializer(serializers.ModelSerializer):
    """Serializer for Referral model."""
    
    respondent_name = serializers.CharField(source='respondent.full_name', read_only=True)
    from_organization_name = serializers.CharField(source='from_organization.name', read_only=True)
    to_organization_name = serializers.CharField(source='to_organization.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Referral
        fields = [
            'id', 'respondent', 'respondent_name',
            'from_organization', 'from_organization_name',
            'to_organization', 'to_organization_name',
            'reason', 'status', 'referred_date', 'completed_date',
            'notes', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'referred_date', 'created_by']
