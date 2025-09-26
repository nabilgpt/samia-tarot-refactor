import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ConfigProvider } from './context/ConfigContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { initializeSupabase } from './lib/supabase';
import { initializeMonitoring } from './utils/monitoring.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import PerformanceProvider from './components/Performance/PerformanceProvider';
import LCPOptimizer from './components/Performance/LCPOptimizer';
import INPOptimizer from './components/Performance/INPOptimizer';
import CLSOptimizer, { FontLoadingOptimizer } from './components/Performance/CLSOptimizer';
import dashboardHealthMonitor from './utils/dashboardHealthMonitor';
import systemIntegration from './utils/systemIntegration';
import ProtectedRoute from './components/ProtectedRoute';
import QuickCommandPalette from './components/Admin/QuickCommandPalette';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast-styles.css';
// M36 Critical path imports (loaded immediately)
import Home from './pages/Home';
import Login from './pages/Login';
import Layout from './components/Layout';

// M36 INP Optimization - Lazy load non-critical components
const Signup = React.lazy(() => import('./pages/Signup'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const BookingPage = React.lazy(() => import('./pages/BookingPage'));
const ReadersPage = React.lazy(() => import('./pages/ReadersPage'));
const Services = React.lazy(() => import('./pages/Services'));
const ServiceDetails = React.lazy(() => import('./pages/ServiceDetails'));
const About = React.lazy(() => import('./pages/About'));
const Contact = React.lazy(() => import('./pages/Contact'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const WalletPage = React.lazy(() => import('./pages/WalletPage'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));
const BookingsPage = React.lazy(() => import('./pages/BookingsPage'));

// Dashboard components (heavy, lazy load)
const ClientDashboard = React.lazy(() => import('./pages/dashboard/ClientDashboard'));
const ReaderDashboard = React.lazy(() => import('./pages/dashboard/ReaderDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/dashboard/AdminDashboard'));
const MonitorDashboard = React.lazy(() => import('./pages/dashboard/MonitorDashboard'));
const SuperAdminDashboard = React.lazy(() => import('./pages/dashboard/SuperAdminDashboard'));
const ObservabilityDashboard = React.lazy(() => import('./pages/dashboard/ObservabilityDashboard'));
const BackupDashboard = React.lazy(() => import('./pages/dashboard/BackupDashboard'));
const E2ESyntheticsDashboard = React.lazy(() => import('./pages/dashboard/E2ESyntheticsDashboard'));
const PerformanceDashboard = React.lazy(() => import('./pages/dashboard/PerformanceDashboard'));
const WalletDashboardPage = React.lazy(() => import('./pages/dashboard/WalletDashboardPage'));

// Admin pages (heavy, lazy load)
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminReadersPage = React.lazy(() => import('./pages/admin/AdminReadersPage'));
const AdminFinancesPage = React.lazy(() => import('./pages/admin/AdminFinancesPage'));
const AdminAnalyticsPage = React.lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminReviewsPage = React.lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminMessagesPage = React.lazy(() => import('./pages/admin/AdminMessagesPage'));
const AdminReportsPage = React.lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminIncidentsPage = React.lazy(() => import('./pages/admin/AdminIncidentsPage'));
const AdminSecurityPage = React.lazy(() => import('./pages/admin/AdminSecurityPage'));
const AdminProfilePage = React.lazy(() => import('./pages/admin/AdminProfilePage'));
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage'));
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
      <PerformanceProvider>
        <LanguageProvider>
        <UIProvider>
          <AuthProvider>
            <ConfigProvider>
            <Router future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}>
              <LCPOptimizer fallback={<div className="app-loading">Loading...</div>}>
                <INPOptimizer>
                  <CLSOptimizer>
                    <FontLoadingOptimizer />
                    <QuickCommandPalette />
                  <Suspense fallback={<div className="app-loading">Loading...</div>}>
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
                  <Route 
                    path="dashboard/e2e-synthetics" 
                    element={
                      <ProtectedRoute requiredRoles={getAdminRoles()} showUnauthorized={true}>
                        <E2ESyntheticsDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="dashboard/performance" 
                    element={
                      <ProtectedRoute requiredRoles={getAdminRoles()} showUnauthorized={true}>
                        <PerformanceDashboard />
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
                    </Suspense>
                  </CLSOptimizer>
                </INPOptimizer>
              </LCPOptimizer>
                <BilingualToastContainer />
            </Router>
            </ConfigProvider>
          </AuthProvider>
        </UIProvider>
        </LanguageProvider>
      </PerformanceProvider>
    </ErrorBoundary>
  );
}

export default App; 