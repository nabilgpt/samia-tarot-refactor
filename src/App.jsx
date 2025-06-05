import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ConfigProvider } from './context/ConfigContext';
import { initializeSupabase } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
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
import WalletDashboardPage from './pages/dashboard/WalletDashboardPage';
import ThemeDemo from './pages/ThemeDemo';
import SupabaseTest from './components/SupabaseTest';
import RoleDemo from './components/RoleDemo';
import RoleBasedAccessTest from './tests/security/RoleBasedAccessTest';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './i18n';
import './styles/recaptcha.css';
import './styles/form-overrides.css';

// Automatic Dashboard Router Component
const DashboardRouter = () => {
  const { profile, loading, initialized } = useAuth();
  
  console.log('🔄 DashboardRouter - Profile:', profile?.role);
  
  // Show loading while checking profile
  if (loading || !initialized) {
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

  // Redirect based on user role
  if (profile?.role) {
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
  }
  
  // Fallback to client dashboard
  console.log('⚠️ DashboardRouter: No role found, defaulting to client dashboard');
  return <Navigate to="/dashboard/client" replace />;
};

function App() {
  useEffect(() => {
    initializeSupabase();
  }, []);

  return (
    <UIProvider>
      <AuthProvider>
        <ConfigProvider>
          <Router>
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
                
                {/* Demo/Test Routes (should be protected in production) */}
                <Route path="test" element={
                  <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                    <SupabaseTest />
                  </ProtectedRoute>
                } />
                <Route path="demo" element={
                  <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                    <RoleDemo />
                  </ProtectedRoute>
                } />
                <Route path="security-test" element={
                  <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                    <RoleBasedAccessTest />
                  </ProtectedRoute>
                } />
                <Route path="theme-demo" element={<ThemeDemo />} />
                
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
                    <ProtectedRoute requiredRoles={['admin']} showUnauthorized={true}>
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
          </Router>
        </ConfigProvider>
      </AuthProvider>
    </UIProvider>
  );
}

export default App; 