import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'

// Pages
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import BookingPage from './pages/BookingPage'
import SessionsPage from './pages/SessionsPage'
import WalletPage from './pages/WalletPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NotFoundPage from './pages/NotFoundPage'

// Legal Pages
import TermsPage from './pages/legal/TermsPage'
import PrivacyPage from './pages/legal/PrivacyPage'
import RefundPage from './pages/legal/RefundPage'

function App() {
  return (
    <>
      <Helmet>
        <html lang="ar" dir="rtl" />
        <title>سامية تاروت - منصة القراءات الروحانية</title>
        <meta name="description" content="منصة سامية تاروت للقراءات الروحانية والأبراج اليومية مع خبراء معتمدين" />
        <meta name="keywords" content="تاروت, أبراج, قراءة روحانية, سامية, لبنان, قراءة الطالع" />
        <meta property="og:title" content="سامية تاروت - منصة القراءات الروحانية" />
        <meta property="og:description" content="احجز جلسة قراءة روحانية مع خبراء معتمدين واكتشف برجك اليومي" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="سامية تاروت" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="سامية تاروت" />
      </Helmet>

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund" element={<RefundPage />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          {/* Main App Routes */}
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="book/:readerId?" element={<BookingPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Redirects */}
          <Route path="home" element={<Navigate to="/" replace />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App