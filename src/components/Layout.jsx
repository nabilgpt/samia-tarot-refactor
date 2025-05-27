import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useUI } from '../context/UIContext';

const Layout = () => {
  const location = useLocation();
  const { notifications, removeNotification } = useUI();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-cosmic-gradient flex flex-col">
      <Navbar />
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Footer />

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 rtl:right-auto rtl:left-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`max-w-sm p-4 rounded-lg shadow-lg border backdrop-blur-sm transform transition-all duration-300 ${
                notification.type === 'success'
                  ? 'bg-green-900/90 border-green-400/50 text-green-100'
                  : notification.type === 'error'
                  ? 'bg-red-900/90 border-red-400/50 text-red-100'
                  : notification.type === 'warning'
                  ? 'bg-yellow-900/90 border-yellow-400/50 text-yellow-100'
                  : 'bg-blue-900/90 border-blue-400/50 text-blue-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  {notification.title && (
                    <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                  )}
                  <p className="text-sm">{notification.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 rtl:ml-0 rtl:mr-2 text-current hover:opacity-70 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scroll to Top Button */}
      <ScrollToTopButton />
    </div>
  );
};

// Scroll to Top Button Component
const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 rtl:right-auto rtl:left-8 z-40 p-3 bg-gold-gradient text-dark-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </>
  );
};

export default Layout; 