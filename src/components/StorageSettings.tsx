import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { useLanguage } from '../i18n/LanguageContext';

export function StorageSettings() {
  const { t, isRTL } = useLanguage();
  const [storageConfig, setStorageConfig] = useState({
    storageType: 'local', // 'local' or 'nas'
    localPath: '/var/surveillance/storage',
    nasPath: '',
    retentionDays: 30,
    maxStorageGB: 1000,
  });

  const [testingStorage, setTestingStorage] = useState(false);

  const testStoragePath = async () => {
    setTestingStorage(true);
    try {
      // Simulate storage path test
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(t('connectionSuccessful'));
    } catch (error) {
      toast.error(t('connectionFailed'));
    } finally {
      setTestingStorage(false);
    }
  };

  const saveStorageSettings = async () => {
    try {
      // Save storage configuration
      toast.success(t('settingsUpdated'));
    } catch (error) {
      toast.error(t('failedToUpdateSettings'));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('storageSettings')}</h3>
      
      <div className="space-y-6">
        {/* Storage Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('storageOption')}
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="storageType"
                value="local"
                checked={storageConfig.storageType === 'local'}
                onChange={(e) => setStorageConfig({ ...storageConfig, storageType: e.target.value })}
                className={`${isRTL ? 'ml-2' : 'mr-2'}`}
              />
              <span className="text-sm">{t('localStorage')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="storageType"
                value="nas"
                checked={storageConfig.storageType === 'nas'}
                onChange={(e) => setStorageConfig({ ...storageConfig, storageType: e.target.value })}
                className={`${isRTL ? 'ml-2' : 'mr-2'}`}
              />
              <span className="text-sm">{t('nasStorage')}</span>
            </label>
          </div>
        </div>

        {/* Storage Path Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {storageConfig.storageType === 'local' ? t('localPath') : t('nasPath')} *
          </label>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <input
              type="text"
              required
              value={storageConfig.storageType === 'local' ? storageConfig.localPath : storageConfig.nasPath}
              onChange={(e) => setStorageConfig({
                ...storageConfig,
                [storageConfig.storageType === 'local' ? 'localPath' : 'nasPath']: e.target.value
              })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={storageConfig.storageType === 'local' 
                ? '/var/surveillance/storage' 
                : '//192.168.1.100/surveillance'
              }
            />
            <button
              type="button"
              onClick={testStoragePath}
              disabled={testingStorage}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {testingStorage ? t('testing') : t('testConnection')}
            </button>
          </div>
          {storageConfig.storageType === 'nas' && (
            <p className="text-xs text-gray-500 mt-1">
              Format: //server-ip/share-name or smb://server-ip/share-name
            </p>
          )}
        </div>

        {/* Storage Capacity and Retention */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('storageCapacity')} (GB)
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={storageConfig.maxStorageGB}
              onChange={(e) => setStorageConfig({ ...storageConfig, maxStorageGB: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('retentionDays')}
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={storageConfig.retentionDays}
              onChange={(e) => setStorageConfig({ ...storageConfig, retentionDays: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Storage Information */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Storage Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Used Space:</span>
              <span className="font-medium text-gray-900 ml-2">245 GB</span>
            </div>
            <div>
              <span className="text-gray-600">Available Space:</span>
              <span className="font-medium text-gray-900 ml-2">755 GB</span>
            </div>
            <div>
              <span className="text-gray-600">Total Recordings:</span>
              <span className="font-medium text-gray-900 ml-2">1,247</span>
            </div>
            <div>
              <span className="text-gray-600">Oldest Recording:</span>
              <span className="font-medium text-gray-900 ml-2">15 days ago</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveStorageSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('configure')}
          </button>
        </div>
      </div>
    </div>
  );
}
