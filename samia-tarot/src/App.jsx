import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthPage from './pages/AuthPage';
import BookingPage from './pages/BookingPage';
import ClientDashboard from './pages/dashboard/ClientDashboard';
import ReaderDashboard from './pages/dashboard/ReaderDashboard';
import SupabaseTest from './components/SupabaseTest';
import RoleDemo from './components/RoleDemo';
import './i18n';
import './styles/recaptcha.css';

function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="auth" element={<AuthPage />} />
              <Route path="test" element={<SupabaseTest />} />
              <Route path="demo" element={<RoleDemo />} />
              <Route path="book/:serviceId?" element={<BookingPage />} />
              <Route path="dashboard/client" element={<ClientDashboard />} />
              <Route path="dashboard/reader" element={<ReaderDashboard />} />
              {/* Add more routes here as we create them */}
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </UIProvider>
  );
}

export default App; 