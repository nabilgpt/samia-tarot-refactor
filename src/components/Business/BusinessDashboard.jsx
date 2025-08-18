import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, Package, TrendingUp, Settings, 
  CreditCard, Calendar, Star, AlertCircle, Plus,
  Edit, Trash2, Eye, Download, Filter, Search,
  BarChart3, PieChart, Target, Clock, ArrowUpRight
} from 'lucide-react';
import api from '../../services/frontendApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const BusinessDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [businessProfile, setBusinessProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [insights, setInsights] = useState(null);
  const [showCreatePackage, setShowCreatePackage] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadBusinessData();
    }
  }, [user?.id]);

  const loadBusinessData = async () => {
    setLoading(true);
    try {
      const [profileResult, transactionsResult, clientsResult, packagesResult, insightsResult] = await Promise.all([
        api.getBusinessProfile(user.id),
        api.getFinancialTransactions(user.id, { limit: 10 }),
        api.getClientRelationships(user.id, { limit: 10 }),
        api.getServicePackages(user.id),
        api.getBusinessInsights(user.id)
      ]);

      if (profileResult.success) setBusinessProfile(profileResult.data);
      if (transactionsResult.success) setTransactions(transactionsResult.data);
      if (clientsResult.success) setClients(clientsResult.data);
      if (packagesResult.success) setPackages(packagesResult.data);
      if (insightsResult.success) setInsights(insightsResult.data);
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'profile', label: 'Business Profile', icon: Settings },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'packages', label: 'Service Packages', icon: Package },
    { id: 'insights', label: 'Insights', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your spiritual practice business</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab 
            insights={insights} 
            transactions={transactions}
            clients={clients}
            packages={packages}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'profile' && (
          <BusinessProfileTab 
            profile={businessProfile}
            onUpdate={loadBusinessData}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab 
            transactions={transactions}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsTab 
            clients={clients}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'packages' && (
          <PackagesTab 
            packages={packages}
            onUpdate={loadBusinessData}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab 
            insights={insights}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ insights, transactions, clients, packages, formatCurrency }) => (
  <div className="space-y-8">
    {/* Key Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Monthly Revenue"
        value={formatCurrency(insights?.revenue?.currentPeriodRevenue || 0)}
        change={`${insights?.revenue?.growthPercentage?.toFixed(1) || 0}%`}
        trend={insights?.revenue?.trend || 'stable'}
        icon={DollarSign}
        color="green"
      />
      <MetricCard
        title="Active Clients"
        value={insights?.clients?.activeClients || 0}
        change={`${insights?.clients?.retentionRate?.toFixed(1) || 0}% retention`}
        trend="up"
        icon={Users}
        color="blue"
      />
      <MetricCard
        title="Service Packages"
        value={insights?.packages?.activePackages || 0}
        change={`${insights?.packages?.totalSales || 0} sold`}
        trend="up"
        icon={Package}
        color="purple"
      />
      <MetricCard
        title="Success Rate"
        value={`${insights?.transactions?.successRate?.toFixed(1) || 0}%`}
        change="Payment processing"
        trend="up"
        icon={Target}
        color="yellow"
      />
    </div>

    {/* Recent Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${
                  transaction.transaction_type === 'earning' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  <DollarSign className={`w-4 h-4 ${
                    transaction.transaction_type === 'earning' ? 'text-green-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {transaction.transaction_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="font-semibold text-gray-900">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Clients */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Clients</h3>
          <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {clients.slice(0, 5).map((client) => (
            <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {client.user_profiles?.full_name || 'Anonymous Client'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {client.total_sessions} sessions
                  </p>
                </div>
              </div>
              <span className="font-semibold text-gray-900">
                {formatCurrency(client.total_spent)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Business Recommendations */}
    {insights?.recommendations && insights.recommendations.length > 0 && (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Recommendations</h3>
        <div className="space-y-4">
          {insights.recommendations.map((rec, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              rec.priority === 'high' ? 'bg-red-50 border-red-400' :
              rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
              'bg-blue-50 border-blue-400'
            }`}>
              <div className="flex items-start">
                <AlertCircle className={`w-5 h-5 mt-0.5 mr-3 ${
                  rec.priority === 'high' ? 'text-red-600' :
                  rec.priority === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <div>
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  <button className="text-sm font-medium text-purple-600 hover:text-purple-700 mt-2">
                    {rec.action} →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Metric Card Component
const MetricCard = ({ title, value, change, trend, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center mt-4">
        <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
        <span className="text-sm text-gray-600">{change}</span>
      </div>
    </div>
  );
};

// Business Profile Tab Component
const BusinessProfileTab = ({ profile, onUpdate, formatCurrency }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(profile || {});

  const handleSave = async () => {
    try {
      const result = await api.updateBusinessProfile(profile.reader_id, formData);
      if (result.success) {
        setEditing(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            {editing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.business_name || ''}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-gray-900">{profile?.business_name || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type
            </label>
            {editing ? (
              <select
                value={formData.business_type || 'individual'}
                onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="individual">Individual</option>
                <option value="llc">LLC</option>
                <option value="corporation">Corporation</option>
              </select>
            ) : (
              <p className="text-gray-900 capitalize">{profile?.business_type || 'Individual'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Rate
            </label>
            <p className="text-gray-900">{profile?.commission_rate || 20}%</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Schedule
            </label>
            <p className="text-gray-900 capitalize">{profile?.payment_schedule || 'Weekly'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Payout
            </label>
            <p className="text-gray-900">{formatCurrency(profile?.minimum_payout || 50)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Currency
            </label>
            <p className="text-gray-900">{profile?.preferred_currency || 'USD'}</p>
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(profile?.working_hours || {}).map(([day, hours]) => (
            <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900 capitalize">{day}</span>
              <span className="text-sm text-gray-600">
                {hours.enabled ? `${hours.start} - ${hours.end}` : 'Closed'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Transactions Tab Component
const TransactionsTab = ({ transactions, formatCurrency, formatDate }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">Financial Transactions</h3>
      <div className="flex items-center space-x-4">
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
        <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Download className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(transaction.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {transaction.transaction_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                    transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {transaction.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {transaction.payment_method || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-purple-600 hover:text-purple-900">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Clients Tab Component
const ClientsTab = ({ clients, formatCurrency, formatDate }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">Client Relationships</h3>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client) => (
        <div key={client.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <h4 className="font-medium text-gray-900">
                  {client.user_profiles?.full_name || 'Anonymous Client'}
                </h4>
                <p className="text-sm text-gray-500">
                  Since {formatDate(client.first_session_date)}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              client.relationship_status === 'active' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {client.relationship_status}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Sessions</span>
              <span className="font-medium">{client.total_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Spent</span>
              <span className="font-medium">{formatCurrency(client.total_spent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Rating</span>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                <span className="font-medium">{client.average_rating || 'N/A'}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Session</span>
              <span className="font-medium">{formatDate(client.last_session_date)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Packages Tab Component
const PackagesTab = ({ packages, onUpdate, formatCurrency, formatDate }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Service Packages</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {pkg.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Price</span>
                <span className="font-medium">{formatCurrency(pkg.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type</span>
                <span className="font-medium capitalize">{pkg.package_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sessions</span>
                <span className="font-medium">{pkg.session_count || 'Unlimited'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Validity</span>
                <span className="font-medium">{pkg.validity_days} days</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50">
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </button>
              <button className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Package Form Modal would go here */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Package</h3>
            {/* Form fields would go here */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Create Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Insights Tab Component
const InsightsTab = ({ insights, formatCurrency }) => (
  <div className="space-y-8">
    {/* Performance Overview */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Revenue Growth</p>
            <p className="text-2xl font-bold text-gray-900">
              {insights?.revenue?.growthPercentage?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Client Retention</p>
            <p className="text-2xl font-bold text-gray-900">
              {insights?.clients?.retentionRate?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Client Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(insights?.clients?.averageClientValue || 0)}
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-full">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {insights?.transactions?.successRate?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-full">
            <Target className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </div>
    </div>

    {/* Detailed Insights */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Insights</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Current Period Revenue</span>
            <span className="font-semibold">
              {formatCurrency(insights?.revenue?.currentPeriodRevenue || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Previous Period Revenue</span>
            <span className="font-semibold">
              {formatCurrency(insights?.revenue?.previousPeriodRevenue || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Growth Trend</span>
            <span className={`font-semibold flex items-center ${
              insights?.revenue?.trend === 'up' ? 'text-green-600' :
              insights?.revenue?.trend === 'down' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {insights?.revenue?.trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : null}
              {insights?.revenue?.trend || 'Stable'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Insights</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Clients</span>
            <span className="font-semibold">{insights?.clients?.totalClients || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Active Clients</span>
            <span className="font-semibold">{insights?.clients?.activeClients || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Retention Rate</span>
            <span className="font-semibold">
              {insights?.clients?.retentionRate?.toFixed(1) || 0}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Client Value</span>
            <span className="font-semibold">
              {formatCurrency(insights?.clients?.averageClientValue || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Recommendations */}
    {insights?.recommendations && insights.recommendations.length > 0 && (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actionable Recommendations</h3>
        <div className="space-y-4">
          {insights.recommendations.map((rec, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              rec.priority === 'high' ? 'bg-red-50 border-red-400' :
              rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
              'bg-blue-50 border-blue-400'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  <button className="text-sm font-medium text-purple-600 hover:text-purple-700 mt-2">
                    {rec.action} →
                  </button>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {rec.priority} priority
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default BusinessDashboard; 