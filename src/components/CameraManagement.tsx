import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { useLanguage } from '../i18n/LanguageContext';

export function CameraManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const cameras = useQuery(api.cameras.listCameras);
  const addCamera = useMutation(api.cameras.addCamera);
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    rtspUrl: '',
    location: '',
    resolution: '1920x1080',
    fps: 30,
    username: '',
    password: '',
    codec: 'h264',
    aiModes: {
      faceDetection: true,
      plateRecognition: true,
      motionDetection: true,
      recordingEnabled: true,
    },
    allowedIpRanges: ['192.168.1.0/24'],
  });

  const [testingConnection, setTestingConnection] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCamera({
        ...formData,
        settings: formData.aiModes,
      });
      toast.success(t('cameraAddedSuccessfully'));
      setFormData({
        name: '',
        rtspUrl: '',
        location: '',
        resolution: '1920x1080',
        fps: 30,
        username: '',
        password: '',
        codec: 'h264',
        aiModes: {
          faceDetection: true,
          plateRecognition: true,
          motionDetection: true,
          recordingEnabled: true,
        },
        allowedIpRanges: ['192.168.1.0/24'],
      });
      setShowAddForm(false);
    } catch (error) {
      toast.error(t('failedToAddCamera') + ': ' + (error as Error).message);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(t('connectionSuccessful'));
    } catch (error) {
      toast.error(t('connectionFailed'));
    } finally {
      setTestingConnection(false);
    }
  };

  const addIpRange = () => {
    setFormData({
      ...formData,
      allowedIpRanges: [...formData.allowedIpRanges, '']
    });
  };

  const removeIpRange = (index: number) => {
    const newRanges = formData.allowedIpRanges.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      allowedIpRanges: newRanges
    });
  };

  const updateIpRange = (index: number, value: string) => {
    const newRanges = [...formData.allowedIpRanges];
    newRanges[index] = value;
    setFormData({
      ...formData,
      allowedIpRanges: newRanges
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('cameraManagement')}</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showAddForm ? t('cancel') : t('addCamera')}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('addNewCamera')}</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Camera Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('cameraName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isRTL ? "مثال: ورودی اصلی" : "e.g., Front Entrance"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('location')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isRTL ? "مثال: ساختمان الف - ورودی اصلی" : "e.g., Building A - Main Entrance"}
                />
              </div>
            </div>

            {/* RTSP Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">{t('rtspAuthentication')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('cameraUsername')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('cameraPassword')} *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rtspUrl')} *
                </label>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <input
                    type="url"
                    required
                    value={formData.rtspUrl}
                    onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="rtsp://192.168.1.100:554/stream"
                  />
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={testingConnection || !formData.rtspUrl}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {testingConnection ? t('testing') : t('testConnection')}
                  </button>
                </div>
              </div>
            </div>

            {/* Video Settings */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">{t('videoEncoding')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('codec')}
                  </label>
                  <select
                    value={formData.codec}
                    onChange={(e) => setFormData({ ...formData, codec: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="h264">{t('h264')}</option>
                    <option value="h265">{t('h265')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('resolution')}
                  </label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1920x1080">1920x1080 (Full HD)</option>
                    <option value="1280x720">1280x720 (HD)</option>
                    <option value="640x480">640x480 (SD)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fps')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* AI Processing Modes */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">{t('aiModes')}</h4>
              <p className="text-sm text-gray-600 mb-3">{t('selectAiModes')}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aiModes.faceDetection}
                    onChange={(e) => setFormData({
                      ...formData,
                      aiModes: { ...formData.aiModes, faceDetection: e.target.checked }
                    })}
                    className={`${isRTL ? 'ml-2' : 'mr-2'}`}
                  />
                  <span className="text-sm">{t('faceDetection')}</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aiModes.plateRecognition}
                    onChange={(e) => setFormData({
                      ...formData,
                      aiModes: { ...formData.aiModes, plateRecognition: e.target.checked }
                    })}
                    className={`${isRTL ? 'ml-2' : 'mr-2'}`}
                  />
                  <span className="text-sm">{t('plateRecognition')}</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aiModes.motionDetection}
                    onChange={(e) => setFormData({
                      ...formData,
                      aiModes: { ...formData.aiModes, motionDetection: e.target.checked }
                    })}
                    className={`${isRTL ? 'ml-2' : 'mr-2'}`}
                  />
                  <span className="text-sm">{t('motionDetection')}</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aiModes.recordingEnabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      aiModes: { ...formData.aiModes, recordingEnabled: e.target.checked }
                    })}
                    className={`${isRTL ? 'ml-2' : 'mr-2'}`}
                  />
                  <span className="text-sm">{t('recording')}</span>
                </label>
              </div>
            </div>

            {/* Network Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">{t('networkSettings')}</h4>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('allowedIpRanges')}
              </label>
              <p className="text-xs text-gray-500 mb-2">{t('ipRangeExample')}</p>
              
              {formData.allowedIpRanges.map((range, index) => (
                <div key={index} className={`flex space-x-2 ${isRTL ? 'space-x-reverse' : ''} mb-2`}>
                  <input
                    type="text"
                    value={range}
                    onChange={(e) => updateIpRange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="192.168.1.0/24"
                  />
                  {formData.allowedIpRanges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIpRange(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      {t('removeIpRange')}
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addIpRange}
                className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                {t('addIpRange')}
              </button>
            </div>

            <div className={`flex justify-end space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('addCamera')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{t('configuredCameras')}</h3>
        </div>
        
        {cameras && cameras.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {cameras.map((camera) => (
              <CameraRow key={camera._id} camera={camera} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            {t('noCamerasConfigured')}. {t('addCamerasToStart')}.
          </div>
        )}
      </div>
    </div>
  );
}

function CameraRow({ camera }: { camera: any }) {
  const updateSettings = useMutation(api.cameras.updateCameraSettings);
  const [isEditing, setIsEditing] = useState(false);
  const { t, isRTL } = useLanguage();
  
  const isOnline = camera.lastHeartbeat && 
    (Date.now() - camera.lastHeartbeat) < 5 * 60 * 1000;

  const toggleSetting = async (setting: string, value: boolean) => {
    try {
      await updateSettings({
        cameraId: camera._id,
        settings: {
          ...camera.settings,
          [setting]: value,
        },
      });
      toast.success(t('settingsUpdated'));
    } catch (error) {
      toast.error(t('failedToUpdateSettings'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className={`flex items-center space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
          <div className={`w-4 h-4 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <div>
            <h4 className="text-lg font-medium text-gray-900">{camera.name}</h4>
            <p className="text-sm text-gray-600">{camera.location}</p>
            <p className="text-xs text-gray-500">
              {camera.resolution} • {camera.fps} FPS • {camera.codec?.toUpperCase() || 'H.264'}
            </p>
          </div>
        </div>
        
        <div className={`flex items-center space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? t('online') : t('offline')}
          </span>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isEditing ? t('done') : t('settingsText')}
          </button>
        </div>
      </div>
      
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={camera.settings.faceDetection}
                onChange={(e) => toggleSetting('faceDetection', e.target.checked)}
                className={`${isRTL ? 'ml-2' : 'mr-2'}`}
              />
              <span className="text-sm">{t('faceDetection')}</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={camera.settings.plateRecognition}
                onChange={(e) => toggleSetting('plateRecognition', e.target.checked)}
                className={`${isRTL ? 'ml-2' : 'mr-2'}`}
              />
              <span className="text-sm">{t('plateRecognition')}</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={camera.settings.motionDetection}
                onChange={(e) => toggleSetting('motionDetection', e.target.checked)}
                className={`${isRTL ? 'ml-2' : 'mr-2'}`}
              />
              <span className="text-sm">{t('motionDetection')}</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={camera.settings.recordingEnabled}
                onChange={(e) => toggleSetting('recordingEnabled', e.target.checked)}
                className={`${isRTL ? 'ml-2' : 'mr-2'}`}
              />
              <span className="text-sm">{t('recording')}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
