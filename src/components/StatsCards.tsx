import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useLanguage } from '../i18n/LanguageContext';

export function StatsCards() {
  const cameraStats = useQuery(api.cameras.getCameraStats);
  const eventStats = useQuery(api.aiEvents.getEventStats);
  const { t } = useLanguage();

  const stats = [
    {
      name: t('totalCameras'),
      value: cameraStats?.total || 0,
      icon: '📹',
      color: 'bg-blue-500',
    },
    {
      name: t('activeCameras'),
      value: cameraStats?.active || 0,
      icon: '🟢',
      color: 'bg-green-500',
    },
    {
      name: t('eventsToday'),
      value: eventStats?.today || 0,
      icon: '📊',
      color: 'bg-purple-500',
    },
    {
      name: t('activeAlerts'),
      value: eventStats?.alerts || 0,
      icon: '🚨',
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`${stat.color} rounded-md p-3 text-white text-xl`}>
              {stat.icon}
            </div>
            <div className="ml-4 rtl:ml-0 rtl:mr-4">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
