# SAMIA TAROT - Admin Dashboard System Documentation

## Overview
The SAMIA TAROT Admin Dashboard System provides comprehensive administrative capabilities across multiple user roles, featuring advanced analytics, user management, content moderation, and system configuration tools.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Role-Based Access Control](#role-based-access-control)
3. [Dashboard Components](#dashboard-components)
4. [User Management](#user-management)
5. [Analytics & Reporting](#analytics--reporting)
6. [Content Moderation](#content-moderation)
7. [System Configuration](#system-configuration)
8. [Advanced Features](#advanced-features)
9. [API Integration](#api-integration)
10. [Security Features](#security-features)
11. [Performance Monitoring](#performance-monitoring)
12. [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Components
- **Frontend**: React-based dashboard with role-specific views
- **Backend**: Express.js API with role-based endpoints
- **Database**: Supabase with Row Level Security (RLS)
- **Real-time**: WebSocket connections for live updates
- **Analytics**: Custom analytics engine with data visualization

### Role Hierarchy
```
Super Admin (Level 5)
    ↓
Admin (Level 4)
    ↓
Monitor (Level 3)
    ↓
Reader (Level 2)
    ↓
Client (Level 1)
```

## Role-Based Access Control

### Super Admin Capabilities
- **Full System Access**: Complete control over all platform features
- **User Role Management**: Create, modify, and delete user roles
- **System Configuration**: Environment settings, feature flags
- **Database Management**: Direct database access and maintenance
- **Financial Controls**: Payment processing, revenue management
- **Audit Logs**: Complete system audit trail access
- **Security Settings**: Authentication, authorization configuration

### Admin Capabilities
- **User Management**: CRUD operations on all user accounts
- **Content Moderation**: Review and moderate user-generated content
- **Analytics Dashboard**: Comprehensive platform analytics
- **Reader Management**: Onboard and manage tarot readers
- **Support Management**: Handle customer support tickets
- **Booking Management**: Oversee all booking operations
- **Notification System**: Send platform-wide notifications

### Monitor Capabilities
- **Analytics View**: Read-only access to platform analytics
- **Activity Monitoring**: Real-time platform activity monitoring
- **Report Generation**: Generate various operational reports
- **Alert Management**: Monitor and respond to system alerts
- **Performance Metrics**: Track system performance indicators

## Dashboard Components

### Main Dashboard Layout
```jsx
// src/pages/dashboard/AdminDashboard.jsx
const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = {
    overview: <OverviewTab />,
    users: <UserManagementTab />,
    analytics: <AnalyticsTab />,
    moderation: <ModerationTab />,
    settings: <SettingsTab />
  };

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <DashboardHeader user={user} />
        <TabNavigation 
          tabs={Object.keys(tabs)} 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="dashboard-content">
          {tabs[activeTab]}
        </div>
      </div>
    </AdminLayout>
  );
};
```

### Overview Tab
```jsx
// src/components/Admin/OverviewTab.jsx
const OverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await adminApi.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="overview-tab space-y-6">
      <StatsGrid stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <QuickActions />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <RevenueChart />
        <UserGrowthChart />
        <SessionsChart />
      </div>
    </div>
  );
};
```

### Stats Grid Component
```jsx
// src/components/Admin/StatsGrid.jsx
const StatsGrid = ({ stats }) => {
  const statItems = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      change: stats?.userGrowth || 0,
      icon: UsersIcon,
      color: 'cosmic-blue'
    },
    {
      title: 'Active Readers',
      value: stats?.activeReaders || 0,
      change: stats?.readerGrowth || 0,
      icon: StarIcon,
      color: 'cosmic-purple'
    },
    {
      title: 'Total Revenue',
      value: `$${stats?.totalRevenue || 0}`,
      change: stats?.revenueGrowth || 0,
      icon: CurrencyDollarIcon,
      color: 'cosmic-gold'
    },
    {
      title: 'Completed Sessions',
      value: stats?.completedSessions || 0,
      change: stats?.sessionGrowth || 0,
      icon: CheckCircleIcon,
      color: 'cosmic-teal'
    }
  ];

  return (
    <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <StatCard key={index} {...item} />
      ))}
    </div>
  );
};

const StatCard = ({ title, value, change, icon: Icon, color }) => {
  const isPositive = change >= 0;
  
  return (
    <CosmicCard className="stat-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-cosmic-purple-300 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          <div className={`flex items-center mt-2 text-sm ${
            isPositive ? 'text-cosmic-mint' : 'text-cosmic-rose'
          }`}>
            {isPositive ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
            <span className="ml-1">{Math.abs(change)}%</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-8 h-8 text-${color}-400`} />
        </div>
      </div>
    </CosmicCard>
  );
};
```

## User Management

### User Management Tab
```jsx
// src/components/Admin/UserManagementTab.jsx
const UserManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getUsers({
        ...filters,
        ...pagination
      });
      setUsers(response.data.users);
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.page]);

  return (
    <div className="user-management-tab space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="cosmic-heading text-2xl">User Management</h2>
        <CosmicButton 
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          Add New User
        </CosmicButton>
      </div>

      <UserFilters 
        filters={filters}
        onFiltersChange={setFilters}
      />

      <UserTable 
        users={users}
        onUserUpdate={fetchUsers}
        onUserDelete={handleUserDelete}
      />

      <Pagination 
        pagination={pagination}
        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
      />
    </div>
  );
};
```

### User Table Component
```jsx
// src/components/Admin/UserTable.jsx
const UserTable = ({ users, onUserUpdate, onUserDelete }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleBulkAction = async (action) => {
    try {
      await adminApi.bulkUserAction({
        userIds: selectedUsers,
        action
      });
      onUserUpdate();
      setSelectedUsers([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  return (
    <CosmicCard className="user-table">
      <div className="p-6">
        {selectedUsers.length > 0 && (
          <BulkActionBar 
            selectedCount={selectedUsers.length}
            onAction={handleBulkAction}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cosmic-purple-400/30">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(users.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                  />
                </th>
                <th className="text-left py-3 px-4 text-cosmic-purple-200">User</th>
                <th className="text-left py-3 px-4 text-cosmic-purple-200">Role</th>
                <th className="text-left py-3 px-4 text-cosmic-purple-200">Status</th>
                <th className="text-left py-3 px-4 text-cosmic-purple-200">Joined</th>
                <th className="text-left py-3 px-4 text-cosmic-purple-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <UserRow 
                  key={user.id}
                  user={user}
                  isSelected={selectedUsers.includes(user.id)}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedUsers(prev => [...prev, user.id]);
                    } else {
                      setSelectedUsers(prev => prev.filter(id => id !== user.id));
                    }
                  }}
                  onUpdate={onUserUpdate}
                  onDelete={onUserDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CosmicCard>
  );
};
```

## Analytics & Reporting

### Analytics Dashboard
```jsx
// src/components/Analytics/AdminAnalyticsDashboard.jsx
const AdminAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsApi.getAdminAnalytics(timeRange);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="analytics-dashboard space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="cosmic-heading text-2xl">Analytics Dashboard</h2>
        <TimeRangeSelector 
          value={timeRange}
          onChange={setTimeRange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <RevenueAnalytics data={analyticsData?.revenue} />
        <UserAnalytics data={analyticsData?.users} />
        <SessionAnalytics data={analyticsData?.sessions} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GeographicDistribution data={analyticsData?.geography} />
        <ReaderPerformance data={analyticsData?.readers} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DetailedReports data={analyticsData} />
      </div>
    </div>
  );
};
```

### Chart Components
```jsx
// src/components/Analytics/RevenueChart.jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RevenueChart = ({ data }) => {
  return (
    <CosmicCard className="revenue-chart p-6">
      <h3 className="cosmic-subheading text-lg mb-4">Revenue Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#523a88" />
            <XAxis 
              dataKey="date" 
              stroke="#9c78fc"
              fontSize={12}
            />
            <YAxis 
              stroke="#9c78fc"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#2d1b4e',
                border: '1px solid #7759c2',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#ffd700" 
              strokeWidth={3}
              dot={{ fill: '#ffd700', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CosmicCard>
  );
};
```

## Content Moderation

### Moderation Dashboard
```jsx
// src/components/Admin/ModerationTab.jsx
const ModerationTab = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    priority: 'all',
    status: 'pending'
  });

  const fetchModerationItems = async () => {
    try {
      const response = await moderationApi.getItems(filters);
      setPendingItems(response.data.items);
      setModerationQueue(response.data.queue);
    } catch (error) {
      console.error('Failed to fetch moderation items:', error);
    }
  };

  const handleModerationAction = async (itemId, action, reason = '') => {
    try {
      await moderationApi.moderateItem(itemId, {
        action,
        reason,
        moderatorId: user.id
      });
      fetchModerationItems();
    } catch (error) {
      console.error('Moderation action failed:', error);
    }
  };

  return (
    <div className="moderation-tab space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="cosmic-heading text-2xl">Content Moderation</h2>
        <div className="flex space-x-4">
          <CosmicButton variant="secondary">
            AI Moderation Settings
          </CosmicButton>
          <CosmicButton variant="primary">
            Bulk Actions
          </CosmicButton>
        </div>
      </div>

      <ModerationStats />

      <ModerationFilters 
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ModerationQueue 
            items={pendingItems}
            onAction={handleModerationAction}
          />
        </div>
        <div>
          <ModerationSidebar 
            queue={moderationQueue}
            onRefresh={fetchModerationItems}
          />
        </div>
      </div>
    </div>
  );
};
```

### AI Moderation Integration
```jsx
// src/components/Admin/AIModerationPanel.jsx
const AIModerationPanel = () => {
  const [aiSettings, setAiSettings] = useState({
    enabled: true,
    confidence_threshold: 0.8,
    auto_approve: false,
    categories: {
      spam: true,
      inappropriate: true,
      harmful: true
    }
  });

  const updateAISettings = async (settings) => {
    try {
      await moderationApi.updateAISettings(settings);
      setAiSettings(settings);
    } catch (error) {
      console.error('Failed to update AI settings:', error);
    }
  };

  return (
    <CosmicCard className="ai-moderation-panel p-6">
      <h3 className="cosmic-subheading text-lg mb-4">AI Moderation Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-cosmic-purple-200">Enable AI Moderation</span>
          <CosmicToggle 
            checked={aiSettings.enabled}
            onChange={(enabled) => updateAISettings({ ...aiSettings, enabled })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cosmic-purple-200 mb-2">
            Confidence Threshold: {aiSettings.confidence_threshold}
          </label>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.1"
            value={aiSettings.confidence_threshold}
            onChange={(e) => updateAISettings({
              ...aiSettings,
              confidence_threshold: parseFloat(e.target.value)
            })}
            className="cosmic-slider w-full"
          />
        </div>

        <div className="space-y-2">
          <h4 className="text-cosmic-purple-200 font-medium">Detection Categories</h4>
          {Object.entries(aiSettings.categories).map(([category, enabled]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-cosmic-purple-300 capitalize">{category}</span>
              <CosmicToggle 
                checked={enabled}
                onChange={(checked) => updateAISettings({
                  ...aiSettings,
                  categories: { ...aiSettings.categories, [category]: checked }
                })}
              />
            </div>
          ))}
        </div>
      </div>
    </CosmicCard>
  );
};
```

## System Configuration

### Settings Management
```jsx
// src/components/Admin/SettingsTab.jsx
const SettingsTab = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const sections = {
    general: <GeneralSettings settings={settings} onUpdate={updateSettings} />,
    security: <SecuritySettings settings={settings} onUpdate={updateSettings} />,
    payments: <PaymentSettings settings={settings} onUpdate={updateSettings} />,
    notifications: <NotificationSettings settings={settings} onUpdate={updateSettings} />,
    integrations: <IntegrationSettings settings={settings} onUpdate={updateSettings} />
  };

  const fetchSettings = async () => {
    try {
      const response = await configApi.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (sectionSettings) => {
    try {
      await configApi.updateSettings(sectionSettings);
      setSettings(prev => ({ ...prev, ...sectionSettings }));
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="settings-tab">
      <div className="flex">
        <div className="w-64 pr-6">
          <SettingsSidebar 
            sections={Object.keys(sections)}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>
        <div className="flex-1">
          {sections[activeSection]}
        </div>
      </div>
    </div>
  );
};
```

### Environment Configuration
```jsx
// src/components/Admin/EnvironmentConfig.jsx
const EnvironmentConfig = () => {
  const [envVars, setEnvVars] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchEnvVars = async () => {
    try {
      const response = await configApi.getEnvironmentVariables();
      setEnvVars(response.data);
    } catch (error) {
      console.error('Failed to fetch environment variables:', error);
    }
  };

  const updateEnvVar = async (key, value) => {
    try {
      await configApi.updateEnvironmentVariable(key, value);
      fetchEnvVars();
    } catch (error) {
      console.error('Failed to update environment variable:', error);
    }
  };

  return (
    <CosmicCard className="environment-config p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="cosmic-subheading text-lg">Environment Configuration</h3>
        <CosmicButton 
          variant="primary"
          onClick={() => setShowAddModal(true)}
        >
          Add Variable
        </CosmicButton>
      </div>

      <div className="space-y-4">
        {envVars.map(envVar => (
          <EnvironmentVariable 
            key={envVar.key}
            envVar={envVar}
            onUpdate={updateEnvVar}
          />
        ))}
      </div>

      {showAddModal && (
        <AddEnvironmentVariableModal 
          onClose={() => setShowAddModal(false)}
          onAdd={(key, value) => {
            updateEnvVar(key, value);
            setShowAddModal(false);
          }}
        />
      )}
    </CosmicCard>
  );
};
```

## Advanced Features

### Bulk Operations
```jsx
// src/components/Admin/BulkOperations.jsx
const BulkOperations = ({ selectedItems, onComplete }) => {
  const [operation, setOperation] = useState('');
  const [parameters, setParameters] = useState({});
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const availableOperations = [
    { id: 'update_role', name: 'Update User Roles', requiresRole: true },
    { id: 'send_notification', name: 'Send Notification', requiresMessage: true },
    { id: 'export_data', name: 'Export Data', requiresFormat: true },
    { id: 'delete_accounts', name: 'Delete Accounts', requiresConfirmation: true }
  ];

  const executeBulkOperation = async () => {
    setIsRunning(true);
    setProgress(0);

    try {
      const response = await adminApi.executeBulkOperation({
        operation,
        items: selectedItems,
        parameters
      });

      // Monitor progress
      const progressInterval = setInterval(async () => {
        const statusResponse = await adminApi.getBulkOperationStatus(response.data.operationId);
        setProgress(statusResponse.data.progress);

        if (statusResponse.data.status === 'completed') {
          clearInterval(progressInterval);
          setIsRunning(false);
          onComplete();
        }
      }, 1000);

    } catch (error) {
      console.error('Bulk operation failed:', error);
      setIsRunning(false);
    }
  };

  return (
    <CosmicCard className="bulk-operations p-6">
      <h3 className="cosmic-subheading text-lg mb-4">
        Bulk Operations ({selectedItems.length} items selected)
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cosmic-purple-200 mb-2">
            Operation
          </label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="cosmic-input w-full"
          >
            <option value="">Select operation...</option>
            {availableOperations.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>

        {operation && (
          <OperationParameters 
            operation={operation}
            parameters={parameters}
            onParametersChange={setParameters}
          />
        )}

        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-cosmic-purple-200">Progress</span>
              <span className="text-cosmic-purple-200">{progress}%</span>
            </div>
            <CosmicProgressBar value={progress} />
          </div>
        )}

        <div className="flex space-x-4">
          <CosmicButton 
            variant="primary"
            onClick={executeBulkOperation}
            disabled={!operation || isRunning}
          >
            {isRunning ? 'Processing...' : 'Execute Operation'}
          </CosmicButton>
          <CosmicButton 
            variant="secondary"
            onClick={() => setOperation('')}
            disabled={isRunning}
          >
            Cancel
          </CosmicButton>
        </div>
      </div>
    </CosmicCard>
  );
};
```

### Real-time Monitoring
```jsx
// src/components/Admin/RealTimeMonitor.jsx
const RealTimeMonitor = () => {
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io('/admin-monitor', {
      auth: { token: localStorage.getItem('token') }
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('metrics_update', (data) => {
      setMetrics(data);
    });

    socket.on('system_alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10));
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="real-time-monitor space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="cosmic-subheading text-lg">Real-time System Monitor</h3>
        <div className={`flex items-center space-x-2 ${
          isConnected ? 'text-cosmic-mint' : 'text-cosmic-rose'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-cosmic-mint' : 'bg-cosmic-rose'
          }`} />
          <span className="text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Active Users"
          value={metrics.activeUsers || 0}
          trend={metrics.userTrend}
        />
        <MetricCard 
          title="Server Load"
          value={`${metrics.serverLoad || 0}%`}
          trend={metrics.loadTrend}
          warning={metrics.serverLoad > 80}
        />
        <MetricCard 
          title="Response Time"
          value={`${metrics.responseTime || 0}ms`}
          trend={metrics.responseTrend}
          warning={metrics.responseTime > 1000}
        />
        <MetricCard 
          title="Error Rate"
          value={`${metrics.errorRate || 0}%`}
          trend={metrics.errorTrend}
          warning={metrics.errorRate > 5}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemAlerts alerts={alerts} />
        <LiveActivityFeed />
      </div>
    </div>
  );
};
```

## API Integration

### Admin API Service
```javascript
// src/services/adminApi.js
class AdminApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL;
    this.token = localStorage.getItem('token');
  }

  // User Management
  async getUsers(params = {}) {
    return await this.request('GET', '/admin/users', { params });
  }

  async createUser(userData) {
    return await this.request('POST', '/admin/users', userData);
  }

  async updateUser(userId, userData) {
    return await this.request('PUT', `/admin/users/${userId}`, userData);
  }

  async deleteUser(userId) {
    return await this.request('DELETE', `/admin/users/${userId}`);
  }

  async bulkUserAction(data) {
    return await this.request('POST', '/admin/users/bulk', data);
  }

  // Analytics
  async getDashboardStats() {
    return await this.request('GET', '/admin/analytics/dashboard');
  }

  async getAnalytics(timeRange) {
    return await this.request('GET', '/admin/analytics', { 
      params: { timeRange } 
    });
  }

  // Content Moderation
  async getModerationItems(filters) {
    return await this.request('GET', '/admin/moderation', { 
      params: filters 
    });
  }

  async moderateItem(itemId, action) {
    return await this.request('POST', `/admin/moderation/${itemId}`, action);
  }

  // System Configuration
  async getSettings() {
    return await this.request('GET', '/admin/settings');
  }

  async updateSettings(settings) {
    return await this.request('PUT', '/admin/settings', settings);
  }

  // Bulk Operations
  async executeBulkOperation(operation) {
    return await this.request('POST', '/admin/bulk-operations', operation);
  }

  async getBulkOperationStatus(operationId) {
    return await this.request('GET', `/admin/bulk-operations/${operationId}`);
  }

  // Private methods
  async request(method, endpoint, data = null, options = {}) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      ...options
    };

    if (data) {
      if (method === 'GET') {
        config.params = data.params;
      } else {
        config.data = data;
      }
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }
}

export const adminApi = new AdminApiService();
```

## Security Features

### Access Control Middleware
```javascript
// src/api/middleware/adminAuth.js
const requireAdminRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Log admin action
      await auditLogger.log({
        userId: user.id,
        action: req.method + ' ' + req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });

      next();
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Usage in routes
router.get('/users', 
  authenticateToken, 
  requireAdminRole('admin', 'super_admin'), 
  getUsersController
);
```

### Audit Logging
```javascript
// src/services/auditLogger.js
class AuditLogger {
  async log(auditData) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: auditData.userId,
        action: auditData.action,
        resource_type: auditData.resourceType,
        resource_id: auditData.resourceId,
        ip_address: auditData.ip,
        user_agent: auditData.userAgent,
        metadata: auditData.metadata,
        timestamp: auditData.timestamp
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  async getAuditLogs(filters = {}) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }

    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }
}

export const auditLogger = new AuditLogger();
```

## Performance Monitoring

### Performance Metrics
```jsx
// src/components/Admin/PerformanceMetrics.jsx
const PerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({});
  const [timeRange, setTimeRange] = useState('1h');

  const fetchMetrics = async () => {
    try {
      const response = await adminApi.getPerformanceMetrics(timeRange);
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  return (
    <CosmicCard className="performance-metrics p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="cosmic-subheading text-lg">Performance Metrics</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="cosmic-input w-32"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Average Response Time"
          value={`${metrics.avgResponseTime || 0}ms`}
          status={getResponseTimeStatus(metrics.avgResponseTime)}
        />
        <MetricCard
          title="Throughput"
          value={`${metrics.throughput || 0} req/min`}
          status={getThroughputStatus(metrics.throughput)}
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate || 0}%`}
          status={getErrorRateStatus(metrics.errorRate)}
        />
        <MetricCard
          title="Database Connections"
          value={`${metrics.dbConnections || 0}`}
          status={getDbConnectionStatus(metrics.dbConnections)}
        />
        <MetricCard
          title="Memory Usage"
          value={`${metrics.memoryUsage || 0}%`}
          status={getMemoryStatus(metrics.memoryUsage)}
        />
        <MetricCard
          title="CPU Usage"
          value={`${metrics.cpuUsage || 0}%`}
          status={getCpuStatus(metrics.cpuUsage)}
        />
      </div>

      <div className="mt-6">
        <ResponseTimeChart data={metrics.responseTimeHistory} />
      </div>
    </CosmicCard>
  );
};
```

## Troubleshooting

### Common Issues & Solutions

#### 1. Dashboard Loading Issues
**Symptoms**: Dashboard components not loading or showing errors
**Causes**:
- API endpoint failures
- Authentication token expiration
- Network connectivity issues

**Solutions**:
```javascript
// Debug API calls
const debugApiCall = async (endpoint) => {
  try {
    console.log(`Calling API: ${endpoint}`);
    const response = await adminApi.request('GET', endpoint);
    console.log(`API Response:`, response.data);
    return response;
  } catch (error) {
    console.error(`API Error:`, error.response?.data || error.message);
    throw error;
  }
};

// Check authentication
const checkAuth = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found');
    return false;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      console.error('Token expired');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Invalid token format');
    return false;
  }
};
```

#### 2. Role Permission Errors
**Symptoms**: 403 Forbidden errors when accessing admin features
**Causes**:
- Incorrect role assignment
- Middleware configuration issues
- Database permission problems

**Solutions**:
```javascript
// Verify user role
const verifyUserRole = async (userId) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    console.log(`User role: ${user.role}`);
    return user.role;
  } catch (error) {
    console.error('Failed to verify user role:', error);
  }
};

// Test role permissions
const testRolePermissions = async (role, endpoint) => {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Test-Role': role
      }
    });
    
    console.log(`Role ${role} access to ${endpoint}: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error('Permission test failed:', error);
  }
};
```

#### 3. Real-time Updates Not Working
**Symptoms**: Dashboard not updating with real-time data
**Causes**:
- WebSocket connection issues
- Event listener problems
- Server-side event emission failures

**Solutions**:
```javascript
// Debug WebSocket connection
const debugWebSocket = () => {
  const socket = io('/admin', {
    auth: { token: localStorage.getItem('token') }
  });

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  return socket;
};
```

### Debug Tools
```javascript
// Admin Debug Panel
const AdminDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState({});

  const runDiagnostics = async () => {
    const diagnostics = {
      auth: checkAuth(),
      apiHealth: await checkApiHealth(),
      dbConnection: await checkDbConnection(),
      permissions: await checkPermissions()
    };
    
    setDebugInfo(diagnostics);
  };

  return (
    <CosmicCard className="debug-panel p-6">
      <h3 className="cosmic-subheading text-lg mb-4">Debug Panel</h3>
      
      <CosmicButton onClick={runDiagnostics} className="mb-4">
        Run Diagnostics
      </CosmicButton>

      <div className="space-y-2">
        {Object.entries(debugInfo).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-cosmic-purple-200">{key}:</span>
            <span className={value ? 'text-cosmic-mint' : 'text-cosmic-rose'}>
              {value ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </CosmicCard>
  );
};
```

## Best Practices

1. **Role-Based Development**: Always consider user roles when developing features
2. **Performance Optimization**: Implement pagination and lazy loading for large datasets
3. **Real-time Updates**: Use WebSockets for live data updates
4. **Error Handling**: Implement comprehensive error handling and user feedback
5. **Security First**: Always validate permissions on both frontend and backend
6. **Audit Trail**: Log all administrative actions for security and compliance
7. **Responsive Design**: Ensure admin dashboard works on all device sizes
8. **Testing**: Implement comprehensive testing for all admin features

## Future Enhancements

1. **Advanced Analytics**: Machine learning-powered insights
2. **Mobile Admin App**: Native mobile application for administrators
3. **Voice Commands**: Voice-controlled admin operations
4. **AI Assistant**: AI-powered admin assistant for common tasks
5. **Advanced Automation**: Workflow automation and rule engines
6. **Multi-tenant Support**: Support for multiple organizations
7. **Advanced Reporting**: Custom report builder with scheduling

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 