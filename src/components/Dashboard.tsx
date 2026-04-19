import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SignOutButton } from '../SignOutButton';
import { CameraGrid } from './CameraGrid';
import { EventsList } from './EventsList';
import { StatsCards } from './StatsCards';
import { CameraManagement } from './CameraManagement';
import { StorageSettings } from './StorageSettings';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cameras' | 'events' | 'settings'>('overview');
  const user = useQuery(api.auth.loggedInUser);
  const createDefaultTenant = useMutation(api.cameras.createDefaultTenant);
  const { t, isRTL } = useLanguage();

  // Create default tenant on first load
  useEffect(() => {
    if (user) {
      createDefaultTenant().catch(console.error);
    }
  }, [user, createDefaultTenant]);

  const tabs = [
    { id: 'overview', name: t('overview'), icon: '📊' },
    { id: 'cameras', name: t('cameras'), icon: '📹' },
    { id: 'events', name: t('events'), icon: '🚨' },
    { id: 'settings', name: t('settings'), icon: '⚙️' },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'font-arabic' : ''}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {t('aiSurveillanceSystem')}
              </h1>
            </div>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <span className="text-sm text-gray-600">
                {t('welcome')}, {user?.email || 'User'}
              </span>
              <LanguageSwitcher />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 rtl:space-x-reverse">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={`${isRTL ? 'ml-2' : 'mr-2'}`}>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'cameras' && <CameraManagement />}
        {activeTab === 'events' && <EventsList />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function OverviewTab() {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-6">
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('liveCameraFeeds')}</h3>
          <CameraGrid />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('recentEvents')}</h3>
          <EventsList limit={10} />
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-6">
      {/* Storage Settings */}
      <StorageSettings />
      
      {/* System Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('systemSettings')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <h4 className="font-medium text-gray-900">{t('aiProcessing')}</h4>
              <p className="text-sm text-gray-600">{t('enableRealtimeAi')}</p>
            </div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm">
              {t('enabled')}
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <h4 className="font-medium text-gray-900">{t('alertNotifications')}</h4>
              <p className="text-sm text-gray-600">{t('sendEmailAlerts')}</p>
            </div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm">
              {t('enabled')}
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="font-medium text-gray-900">{t('dataRetention')}</h4>
              <p className="text-sm text-gray-600">{t('keepRecordings')}</p>
            </div>
            <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm">
              {t('configure')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
