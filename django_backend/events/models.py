from django.db import models


class Event(models.Model):
    """Event/Activity model for tracking activities and events."""
    
    TYPE_CHOICES = [
        ('training', 'Training'),
        ('meeting', 'Meeting'),
        ('outreach', 'Outreach'),
        ('workshop', 'Workshop'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='other')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='events'
    )
    
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    
    # Participants
    expected_participants = models.PositiveIntegerField(default=0)
    actual_participants = models.PositiveIntegerField(default=0)
    
    # Budget
    budget = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    actual_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Linked indicators
    indicators = models.ManyToManyField(
        'indicators.Indicator',
        blank=True,
        related_name='events'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_events'
    )
    
    class Meta:
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.title} ({self.start_date})"


class Participant(models.Model):
    """Participant record for events."""
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    respondent = models.ForeignKey(
        'respondents.Respondent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='event_participations'
    )
    
    # For anonymous/unregistered participants
    name = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    contact = models.CharField(max_length=100, blank=True)
    
    attended = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['event', 'respondent']
    
    def __str__(self):
        if self.respondent:
            return f"{self.event.title} - {self.respondent.full_name}"
        return f"{self.event.title} - {self.name}"
