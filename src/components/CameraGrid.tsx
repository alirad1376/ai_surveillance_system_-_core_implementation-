import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useLanguage } from '../i18n/LanguageContext';

export function CameraGrid() {
  const cameras = useQuery(api.cameras.listCameras);
  const { t } = useLanguage();

  if (!cameras || cameras.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('noCamerasConfigured')}</p>
        <p className="text-sm text-gray-400 mt-2">
          {t('addCamerasToStart')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cameras.map((camera) => (
        <CameraCard key={camera._id} camera={camera} />
      ))}
    </div>
  );
}

function CameraCard({ camera }: { camera: any }) {
  const { t } = useLanguage();
  const isOnline = camera.lastHeartbeat && 
    (Date.now() - camera.lastHeartbeat) < 5 * 60 * 1000; // 5 minutes

  return (
    <div className="bg-gray-100 rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">{camera.name}</h4>
        <div className={`w-3 h-3 rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        }`} />
      </div>
      
      {/* Placeholder for video stream */}
      <div className="aspect-video bg-gray-800 rounded-md mb-3 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-2xl mb-2">📹</div>
          <p className="text-sm">{t('liveStream')}</p>
          <p className="text-xs text-gray-300">{camera.resolution}</p>
        </div>
      </div>
      
      <div className="space-y-1 text-sm">
        <p className="text-gray-600">
          <span className="font-medium">{t('location')}:</span> {camera.location}
        </p>
        <p className="text-gray-600">
          <span className="font-medium">{t('status')}:</span>{' '}
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? t('online') : t('offline')}
          </span>
        </p>
        <div className="flex space-x-2 rtl:space-x-reverse mt-2">
          {camera.settings.faceDetection && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              👤 {t('faceDetection')}
            </span>
          )}
          {camera.settings.plateRecognition && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              🚗 {t('plateRecognition')}
            </span>
          )}
          {camera.settings.motionDetection && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              🏃 {t('motionDetection')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
