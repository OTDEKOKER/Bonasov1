from django.contrib import admin
from .models import SocialService, Referral


@admin.register(SocialService)
class SocialServiceAdmin(admin.ModelAdmin):
    list_display = ['respondent', 'service_type', 'provider', 'status', 'start_date']
    list_filter = ['service_type', 'status']
    search_fields = ['respondent__unique_id', 'service_type']


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ['respondent', 'from_organization', 'to_organization', 'status', 'referred_date']
    list_filter = ['status', 'from_organization', 'to_organization']
    search_fields = ['respondent__unique_id', 'reason']
