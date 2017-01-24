"""Learner dashboard URL routing configuration"""
from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^programs/$', views.program_listing, name='program_listing_view'),
    # Matches integers (to support retrieval of programs service-based programs)
    # and UUIDs (to support retrieval of catalog-based programs).
    url(r'^programs/(?P<program_id>[0-9a-f-]+)/$', views.program_details, name='program_details_view'),
]
