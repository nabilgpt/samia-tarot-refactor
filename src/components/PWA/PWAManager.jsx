import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Download, Bell, Wifi, WifiOff, 
  Settings, RefreshCw, Share, Home, Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const PWAManager = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [pushSubscription, setPushSubscription] = useState(null);
  const [offlineData, setOfflineData] = useState({});
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    // Check if app is already installed
    checkInstallStatus();
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    
    // Listen for online/offline status
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    
    // Check for service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Load offline data
    loadOfflineData();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  const checkInstallStatus = () => {
    // Check if running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = window.navigator.standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);
  };

  const handleInstallPrompt = (e) => {
    e.preventDefault();
    setInstallPrompt(e);
  };

  const installApp = async () => {
    if (!installPrompt) return;

    const result = await installPrompt.prompt();
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Check for push subscription
      const subscription = await registration.pushManager.getSubscription();
      setPushSubscription(subscription);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      await subscribeToPush();
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
      });

      setPushSubscription(subscription);
      
      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId: user.id
        })
      });
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  };

  const loadOfflineData = () => {
    const cached = localStorage.getItem('pwa_offline_data');
    if (cached) {
      setOfflineData(JSON.parse(cached));
    }
  };

  const syncData = async () => {
    if (!isOnline) return;

    setSyncStatus('syncing');
    try {
      // Sync offline data with server
      const offlineActions = JSON.parse(localStorage.getItem('pwa_offline_actions') || '[]');
      
      for (const action of offlineActions) {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
      }

      // Clear offline actions
      localStorage.removeItem('pwa_offline_actions');
      setSyncStatus('success');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SAMIA TAROT',
          text: 'Discover your spiritual path with professional tarot readings',
          url: window.location.origin
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.origin);
      alert('App URL copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PWA Manager</h1>
            <p className="text-gray-600 mt-2">Manage your app experience</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-2 rounded-lg ${
              isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Installation */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <Smartphone className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">App Installation</h3>
            </div>

            {isInstalled ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">App Installed!</h4>
                <p className="text-gray-600 mb-4">
                  SAMIA TAROT is installed on your device and ready to use offline.
                </p>
                <button
                  onClick={shareApp}
                  className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mx-auto"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share App
                </button>
              </div>
            ) : (
              <div>
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Download className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Install SAMIA TAROT</h4>
                  <p className="text-gray-600 mb-4">
                    Install the app for a better experience with offline access and push notifications.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-500 mr-3" />
                    <span className="text-sm text-gray-700">Works offline</span>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Bell className="w-5 h-5 text-blue-500 mr-3" />
                    <span className="text-sm text-gray-700">Push notifications</span>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Smartphone className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-700">Native app experience</span>
                  </div>
                </div>

                {installPrompt && (
                  <button
                    onClick={installApp}
                    className="w-full mt-6 flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install App
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <Bell className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Notification Permission</p>
                  <p className="text-sm text-gray-600">
                    {notificationPermission === 'granted' ? 'Enabled' :
                     notificationPermission === 'denied' ? 'Denied' : 'Not requested'}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  notificationPermission === 'granted' ? 'bg-green-500' :
                  notificationPermission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Push Subscription</p>
                  <p className="text-sm text-gray-600">
                    {pushSubscription ? 'Active' : 'Not subscribed'}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  pushSubscription ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>

              {notificationPermission !== 'granted' && (
                <button
                  onClick={requestNotificationPermission}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Notifications
                </button>
              )}
            </div>
          </div>

          {/* Offline Features */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <WifiOff className="w-6 h-6 text-gray-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Offline Features</h3>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Cached Data</h4>
                <div className="text-sm text-gray-600">
                  <p>• Recent tarot readings</p>
                  <p>• Chat messages</p>
                  <p>• User profile</p>
                  <p>• App resources</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Sync Status</p>
                  <p className="text-sm text-gray-600 capitalize">{syncStatus}</p>
                </div>
                <button
                  onClick={syncData}
                  disabled={!isOnline || syncStatus === 'syncing'}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  Sync
                </button>
              </div>
            </div>
          </div>

          {/* App Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <Settings className="w-6 h-6 text-gray-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">App Settings</h3>
            </div>

            <div className="space-y-4">
              <PWASettingToggle
                title="Auto-sync"
                description="Automatically sync data when online"
                defaultValue={true}
                onChange={(value) => console.log('Auto-sync:', value)}
              />

              <PWASettingToggle
                title="Background refresh"
                description="Update content in the background"
                defaultValue={false}
                onChange={(value) => console.log('Background refresh:', value)}
              />

              <PWASettingToggle
                title="Offline mode"
                description="Enable offline functionality"
                defaultValue={true}
                onChange={(value) => console.log('Offline mode:', value)}
              />

              <PWASettingToggle
                title="Data saver"
                description="Reduce data usage"
                defaultValue={false}
                onChange={(value) => console.log('Data saver:', value)}
              />
            </div>
          </div>
        </div>

        {/* PWA Features Info */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">PWA Features</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<WifiOff className="w-8 h-8 text-blue-600" />}
              title="Offline Access"
              description="Use core features even without internet connection"
            />
            
            <FeatureCard
              icon={<Bell className="w-8 h-8 text-green-600" />}
              title="Push Notifications"
              description="Get notified about new messages and appointments"
            />
            
            <FeatureCard
              icon={<Smartphone className="w-8 h-8 text-purple-600" />}
              title="Native Experience"
              description="App-like interface with smooth animations"
            />
            
            <FeatureCard
              icon={<RefreshCw className="w-8 h-8 text-orange-600" />}
              title="Background Sync"
              description="Automatic data synchronization when online"
            />
            
            <FeatureCard
              icon={<Download className="w-8 h-8 text-indigo-600" />}
              title="Fast Loading"
              description="Instant loading with cached resources"
            />
            
            <FeatureCard
              icon={<Share className="w-8 h-8 text-pink-600" />}
              title="Easy Sharing"
              description="Share the app with friends and family"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// PWA Setting Toggle Component
const PWASettingToggle = ({ title, description, defaultValue, onChange }) => {
  const [enabled, setEnabled] = useState(defaultValue);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    onChange(newValue);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-purple-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => (
  <div className="text-center p-4">
    <div className="flex justify-center mb-3">
      {icon}
    </div>
    <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
    <p className="text-sm text-gray-600">{description}</p>
  </div>
);

export default PWAManager; 