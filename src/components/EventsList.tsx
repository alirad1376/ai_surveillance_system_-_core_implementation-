import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useLanguage } from '../i18n/LanguageContext';

interface EventsListProps {
  limit?: number;
}

export function EventsList({ limit }: EventsListProps) {
  const events = useQuery(api.aiEvents.getRecentEvents, { limit });
  const { t } = useLanguage();

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('noEventsDetected')}</p>
        <p className="text-sm text-gray-400 mt-2">
          {t('eventsWillAppear')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const { t } = useLanguage();
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'face_detected': return '👤';
      case 'face_recognized': return '✅';
      case 'plate_detected': return '🚗';
      case 'motion_detected': return '🏃';
      case 'unknown_person': return '❓';
      case 'alert_triggered': return '🚨';
      default: return '📊';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'face_recognized': return 'bg-green-100 text-green-800';
      case 'unknown_person': return 'bg-red-100 text-red-800';
      case 'alert_triggered': return 'bg-red-100 text-red-800';
      case 'plate_detected': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeText = (type: string) => {
    switch (type) {
      case 'face_detected': return t('faceDetected');
      case 'face_recognized': return t('faceRecognized');
      case 'plate_detected': return t('plateDetected');
      case 'motion_detected': return t('motionDetected');
      case 'unknown_person': return t('unknownPerson');
      case 'alert_triggered': return t('alertTriggered');
      default: return type.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <div className="flex items-center space-x-4 rtl:space-x-reverse p-3 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-full ${getEventColor(event.eventType)}`}>
        {getEventIcon(event.eventType)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            {getEventTypeText(event.eventType)}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(event._creationTime).toLocaleTimeString()}
          </p>
        </div>
        
        <div className="mt-1">
          <p className="text-sm text-gray-600">
            {event.cameraName} • {event.cameraLocation}
          </p>
          <p className="text-xs text-gray-500">
            {t('confidence')}: {Math.round(event.confidence * 100)}%
          </p>
        </div>
        
        {event.metadata.plateNumber && (
          <p className="text-xs text-blue-600 mt-1">
            {t('plate')}: {event.metadata.plateNumber}
          </p>
        )}
      </div>
      
      {event.frameUrl && (
        <div className="flex-shrink-0">
          <img
            src={event.frameUrl}
            alt="Event frame"
            className="w-16 h-12 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
}
