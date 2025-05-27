import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthPage from './pages/AuthPage';
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
              {/* Add more routes here as we create them */}
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </UIProvider>
  );
}

export default App; 