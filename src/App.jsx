import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ConfigProvider } from './context/ConfigContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { initializeSupabase } from './lib/supabase';
import { initializeMonitoring } from './utils/monitoring.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import dashboardHealthMonitor from './utils/dashboardHealthMonitor';
import systemIntegration from './utils/systemIntegration';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import QuickCommandPalette from './components/Admin/QuickCommandPalette';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast-styles.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthPage from './pages/AuthPage';
import ForgotPassword from './pages/ForgotPassword';
import BookingPage from './pages/BookingPage';
import ReadersPage from './pages/ReadersPage';
import Services from './pages/Services';
import ServiceDetails from './pages/ServiceDetails';
import About from './pages/About';
import Contact from './pages/Contact';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import MessagesPage from './pages/MessagesPage';
import BookingsPage from './pages/BookingsPage';
import ClientDashboard from './pages/dashboard/ClientDashboard';
import ReaderDashboard from './pages/dashboard/ReaderDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import MonitorDashboard from './pages/dashboard/MonitorDashboard';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import ObservabilityDashboard from './pages/dashboard/ObservabilityDashboard';
import BackupDashboard from './pages/dashboard/BackupDashboard';
import WalletDashboardPage from './pages/dashboard/WalletDashboardPage';
// Import Admin Pages
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminReadersPage from './pages/admin/AdminReadersPage';
import AdminFinancesPage from './pages/admin/AdminFinancesPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminMessagesPage from './pages/admin/AdminMessagesPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminIncidentsPage from './pages/admin/AdminIncidentsPage';
import AdminSecurityPage from './pages/admin/AdminSecurityPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './i18n';
import './styles/recaptcha.css';
import './styles/form-overrides.css';
import './styles/layout-fixes.css';
import { getAdminRoles } from './utils/roleHelpers';

// Automatic Dashboard Router Component
const DashboardRouter = () => {
  const { user, profile, loading, initialized, isAuthenticated } = useAuth();
  
  console.log('🔄 DashboardRouter State:', {
    user: user ? user.email : null,
    profile: profile ? profile.role : null,
    loading,
    initialized,
    isAuthenticated
  });
  
  // Show loading while checking authentication and profile
  if (loading || !initialized || !isAuthenticated) {
    console.log('🔄 DashboardRouter: Showing loading state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium">
              Loading dashboard...
            </p>
            <p className="text-gray-500 text-sm">
              Determining your dashboard access
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Wait for profile to load
  if (!profile) {
    console.log('🔄 DashboardRouter: Waiting for profile to load...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium">
              Loading profile...
            </p>
            <p className="text-gray-500 text-sm">
              Fetching your role and permissions
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect based on user role
  const dashboardPaths = {
    client: '/dashboard/client',
    reader: '/dashboard/reader', 
    admin: '/dashboard/admin',
    monitor: '/dashboard/monitor',
    super_admin: '/dashboard/super-admin'
  };
  
  const targetPath = dashboardPaths[profile.role];
  console.log(`🎯 DashboardRouter: Redirecting ${profile.role} to ${targetPath}`);
  
  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }
  
  // Fallback to client dashboard
  console.log('⚠️ DashboardRouter: Unknown role, defaulting to client dashboard');
  return <Navigate to="/dashboard/client" replace />;
};

// BilingualToastContainer component
const BilingualToastContainer = () => {
  const { currentLanguage } = useLanguage();
  
  return (
    <ToastContainer
      position={currentLanguage === 'ar' ? 'top-left' : 'top-right'}
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={currentLanguage === 'ar'}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      toastClassName="backdrop-blur-sm"
      bodyClassName="text-sm"
      progressClassName="bg-purple-500"
    />
  );
};

function App() {
  useEffect(() => {
    // Initialize core systems
    initializeSupabase();
    initializeMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <LanguageProvider>
      <UIProvider>
        <AuthProvider>
          <ConfigProvider>
            <Router future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}>
              <QuickCommandPalette />
              <Routes>
                <Route path="/" element={<Layout />}>
                  {/* Public Routes */}
                  <Route index element={<Home />} />
                  <Route path="login" element={<Login />} />
                  <Route path="signup" element={<Signup />} />
                  <Route path="auth" element={<AuthPage />} />
                  <Route path="forgot-password" element={<ForgotPassword />} />
                  <Route path="services" element={<Services />} />
                  <Route path="services/:serviceId" element={<ServiceDetails />} />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="readers" element={<ReadersPage />} />
                  
                  {/* Auto Dashboard Router - Redirects users to their role-specific dashboard */}
                  <Route 
                    path="dashboard" 
                    element={
                      <ProtectedRoute>
                        <DashboardRouter />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Demo/Test Routes removed during cleanup */}
                  
                  {/* Protected User Pages - Require Authentication */}
                  <Route path="profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="wallet" element={
                    <ProtectedRoute>
                      <WalletPage />
                    </ProtectedRoute>
                  } />
                  <Route path="messages" element={
                    <ProtectedRoute>
                      <MessagesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="bookings" element={
                    <ProtectedRoute>
                      <BookingsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="book/:serviceId?" element={
                    <ProtectedRoute>
                      <BookingPage />
                    </ProtectedRoute>
                  } />
                  <Route path="booking/:serviceId" element={
                    <ProtectedRoute>
                      <BookingPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Protected Dashboard Routes with Strict Role-Based Access */}
                  <Route 
                    path="dashboard/client" 
                    element={
                      <ProtectedRoute requiredRoles={['client']} showUnauthorized={true}>
                        <ClientDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="client/wallet" 
                    element={
                      <ProtectedRoute requiredRoles={['client']} showUnauthorized={true}>
                        <WalletDashboardPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="dashboard/reader" 
                    element={
                      <ProtectedRoute requiredRoles={['reader']} showUnauthorized={true}>
                        <ReaderDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="dashboard/admin" 
                    element={
                      <ProtectedRoute requiredRoles={getAdminRoles()} showUnauthorized={true}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="dashboard/monitor" 
                    element={
                      <ProtectedRoute requiredRoles={['monitor']} showUnauthorized={true}>
                        <MonitorDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="dashboard/super-admin" 
                    element={
                      <ProtectedRoute requiredRoles={['super_admin']} showUnauthorized={true}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="dashboard/observability" 
                    element={
                      <ProtectedRoute requiredRoles={getAdminRoles()} showUnauthorized={true}>
                        <ObservabilityDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="dashboard/backup" 
                    element={
                      <ProtectedRoute requiredRoles={getAdminRoles()} showUnauthorized={true}>
                        <BackupDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Admin Routes */}
                  <Route path="admin/users" element={
                    <ProtectedRoute requiredRoles={getAdminRoles()}>
                      <AdminUsersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/readers" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AdminReadersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/finances" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AdminFinancesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/analytics" element={
                    <ProtectedRoute requiredRoles={getAdminRoles()}>
                      <AdminAnalyticsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/reviews" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AdminReviewsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/messages" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AdminMessagesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/reports" element={
                    <ProtectedRoute requiredRoles={getAdminRoles()}>
                      <AdminReportsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/incidents" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AdminIncidentsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/security" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AdminSecurityPage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/profile" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AdminProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="admin/settings" element={
                    <ProtectedRoute requiredRoles={getAdminRoles()}>
                      <AdminSettingsPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch-all route for 404 */}
                  <Route path="*" element={
                    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-white mb-4">404 - Page Not Found</h1>
                        <p className="text-gray-300 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
                        <button
                          onClick={() => window.location.href = '/'}
                          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          Go Home
                        </button>
                      </div>
                    </div>
                  } />
                </Route>
              </Routes>
                <BilingualToastContainer />
            </Router>
          </ConfigProvider>
        </AuthProvider>
      </UIProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App; 