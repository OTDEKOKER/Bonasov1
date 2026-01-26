from django.db import models


class SocialService(models.Model):
    """Social services offered to respondents."""
    
    respondent = models.ForeignKey(
        'respondents.Respondent',
        on_delete=models.CASCADE,
        related_name='social_services'
    )
    
    service_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    provider = models.CharField(max_length=255, blank=True)
    
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ],
        default='active'
    )
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_services'
    )
    
    class Meta:
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.respondent.full_name} - {self.service_type}"


class Referral(models.Model):
    """Referrals between organizations for respondents."""
    
    respondent = models.ForeignKey(
        'respondents.Respondent',
        on_delete=models.CASCADE,
        related_name='referrals'
    )
    
    from_organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='referrals_made'
    )
    to_organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='referrals_received'
    )
    
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('accepted', 'Accepted'),
            ('rejected', 'Rejected'),
            ('completed', 'Completed'),
        ],
        default='pending'
    )
    
    referred_date = models.DateField(auto_now_add=True)
    completed_date = models.DateField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_referrals'
    )
    
    class Meta:
        ordering = ['-referred_date']
    
    def __str__(self):
        return f"{self.respondent.full_name}: {self.from_organization.name} -> {self.to_organization.name}"
