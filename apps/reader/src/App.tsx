import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'

// Pages
import DashboardPage from './pages/DashboardPage'
import SchedulePage from './pages/SchedulePage'
import ServicesPage from './pages/ServicesPage'
import SessionsPage from './pages/SessionsPage'
import InboxPage from './pages/InboxPage'
import EarningsPage from './pages/EarningsPage'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <>
      <Helmet>
        <html lang="ar" dir="rtl" />
        <title>قراء سامية تاروت - منصة القراء</title>
        <meta name="description" content="تطبيق قراء منصة سامية تاروت للقراءات الروحانية" />
        <meta name="keywords" content="تاروت, قراء, سامية, لبنان, قراءة الطالع, عمل" />
        <meta property="og:title" content="قراء سامية تاروت - منصة القراء" />
        <meta property="og:description" content="إدارة جلساتك وأرباحك كقارئ معتمد في منصة سامية تاروت" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="قراء سامية" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="قراء سامية" />
      </Helmet>

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <RequireAuth requiredRole="reader">
            <Layout />
          </RequireAuth>
        }>
          {/* Main App Routes */}
          <Route index element={<DashboardPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="earnings" element={<EarningsPage />} />

          {/* Redirects */}
          <Route path="dashboard" element={<Navigate to="/" replace />} />
        </Route>

        {/* 404 - Redirect to dashboard for any unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App