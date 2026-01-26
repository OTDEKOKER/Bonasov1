from rest_framework import serializers
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model."""
    
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    children_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'code', 'type', 'parent', 'parent_name',
            'description', 'address', 'phone', 'email', 'is_active',
            'children_count', 'users_count', 'created_at', 'updated_at',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_children_count(self, obj):
        return obj.children.count()
    
    def get_users_count(self, obj):
        return obj.users.count()


class OrganizationTreeSerializer(serializers.ModelSerializer):
    """Serializer for organization hierarchy tree."""
    
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'code', 'type', 'children']
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return OrganizationTreeSerializer(children, many=True).data


class OrganizationSimpleSerializer(serializers.ModelSerializer):
    """Simple serializer for dropdowns."""
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'code', 'type']
