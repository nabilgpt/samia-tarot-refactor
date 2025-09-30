import React, { useState } from 'react'

const Navigation: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'الرئيسية', href: '/', active: true },
    { label: 'الخدمات', href: '/services', active: false },
    { label: 'القارئات', href: '/readers', active: false },
    { label: 'من نحن', href: '/about', active: false },
    { label: 'اتصل بنا', href: '/contact', active: false }
  ]

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[#0B1020]/80 backdrop-blur border-b border-white/10 h-16"
      dir="rtl"
      aria-label="Main"
    >
      {/* Emergency Banner - Absolutely positioned above navbar */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-2 md:top-1 z-10 hidden md:inline-flex">
        <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 px-4 py-1 rounded-full shadow-lg">
          {/* Warning SVG Icon */}
          <svg
            className="w-4 h-4 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-white text-sm font-semibold">مكالمة الطوارئ</span>
        </div>
      </div>

      {/* Main navbar content */}
      <div className="max-w-7xl mx-auto px-4 w-full h-full">
        <div className="flex items-center justify-between h-full relative">

          {/* Left Side - Dev Pills */}
          <div className="flex items-center gap-2">
            {/* Client Status Pill */}
            <span className="bg-violet-600/20 text-violet-300 border border-violet-500/30 px-3 py-1 rounded-full text-xs font-medium">
              client
            </span>

            {/* Username Pill */}
            <div className="flex items-center gap-2 bg-slate-800/40 text-slate-200 px-3 py-1 rounded-full text-sm">
              <span>saeeeel</span>
              <div className="w-7 h-7 bg-amber-500 text-black font-bold rounded-full flex items-center justify-center text-xs">
                S
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="w-8 h-8 bg-slate-800/40 hover:bg-slate-700/50 rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50"
              aria-label="تبديل الوضع الليلي"
              aria-pressed={isDarkMode}
            >
              {/* Moon SVG Icon */}
              <svg
                className="w-4 h-4 text-slate-200"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </button>

            {/* Account Button */}
            <button className="bg-slate-800/40 hover:bg-slate-700/50 text-slate-200 px-3 py-1 rounded-full text-sm border border-slate-600/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50">
              حسابي
            </button>
          </div>

          {/* Right Side - Brand + Navigation */}
          <div className="flex items-center gap-6">

            {/* Navigation Links - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={`text-sm transition-colors duration-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50 rounded px-2 py-1 ${
                    link.active
                      ? 'text-white font-bold bg-amber-500/10 border-b-2 border-amber-500'
                      : 'text-slate-200'
                  }`}
                  aria-current={link.active ? 'page' : undefined}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden w-8 h-8 bg-slate-800/40 hover:bg-slate-700/50 rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50"
              aria-label="فتح القائمة"
              aria-expanded={isMobileMenuOpen}
            >
              {/* Hamburger Menu SVG */}
              <svg
                className="w-4 h-4 text-slate-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <span className="text-white text-lg font-bold">سامية</span>

              {/* Logo Box with س */}
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-black text-lg font-bold">س</span>
              </div>

              <span className="text-white text-lg font-bold">تاروت</span>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#0B1020]/95 backdrop-blur border-b border-white/10 py-4">
            <div className="flex flex-col gap-2 px-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={`text-sm py-2 px-3 rounded transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50 ${
                    link.active
                      ? 'text-white font-bold bg-amber-500/10'
                      : 'text-slate-200'
                  }`}
                  aria-current={link.active ? 'page' : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reduced Motion Media Query */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (prefers-reduced-motion: reduce) {
            .transition-colors {
              transition: none;
            }
          }
        `
      }} />
    </nav>
  )
}

export default Navigation