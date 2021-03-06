# chat/routing.py
from django.conf.urls import url

from . import consumers

websocket_urlpatterns = [
    url(r'^ws/speaker/audioplayback/$', consumers.AudioPlaybackConsumer),
    url(r'^ws/speaker/audiorecord/$', consumers.AudioRecordConsumer),
]