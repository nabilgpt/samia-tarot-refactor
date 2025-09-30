import React from 'react';
import { Helmet } from 'react-helmet-async';
import CosmicBackground from '../components/CosmicBackground';

export default function HomePage() {
  React.useEffect(() => {
    console.log('HomePage mounted');
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>الرئيسية - سامية تاروت</title>
        <meta name="description" content="اكتشف قدرك مع مدام سامية - تواصل مع خبراء قراءة التاروت واكتشف أسرار مستقبلك" />
      </Helmet>

      {/* Advanced particle background */}
      <CosmicBackground />

      {/* Main content - FIXED positioning to ensure visibility */}
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          overflowY: 'auto',
          zIndex: 10,
          paddingTop: '80px', // Space for dev banner + top navbar
          paddingBottom: '80px' // Space for bottom nav
        }}
        dir="rtl">

        {/* Main Content Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 120px)', // Account for padding
          padding: '20px',
          textAlign: 'center'
        }}>

          {/* Large Main Heading - Orange to Pink to Cyan gradient exactly like image */}
          <h1 style={{
            fontSize: 'clamp(3rem, 7vw, 6rem)',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            lineHeight: '1.2',
            background: 'linear-gradient(90deg, #f97316 0%, #ec4899 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Amiri, serif'
          }}>
            اكتشف قدرك
          </h1>

          {/* Secondary Heading - Pink to Purple gradient exactly like image */}
          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 'bold',
            marginBottom: '2rem',
            lineHeight: '1.2',
            background: 'linear-gradient(90deg, #f97316 0%, #ec4899 35%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Amiri, serif'
          }}>
            مع مدام سامية
          </h2>

          {/* Subtitle - Light gray/white like in image */}
          <p style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '3rem',
            maxWidth: '800px',
            lineHeight: '1.8',
            fontWeight: '400',
            fontFamily: 'Amiri, serif'
          }}>
            تواصل مع خبراء قراءة التاروت واكتشف أسرار مستقبلك
          </p>

          {/* Action Buttons - Matching exact styles from image */}
          <div style={{
            display: 'flex',
            flexDirection: window.innerWidth < 640 ? 'column' : 'row',
            gap: '1.5rem',
            marginBottom: '4rem'
          }}>
            {/* Left Button - Purple/Transparent with white text */}
            <button
              style={{
                padding: '1rem 2.5rem',
                background: 'rgba(139, 92, 246, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                borderRadius: '1rem',
                cursor: 'pointer',
                minWidth: '240px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                fontFamily: 'Amiri, serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.transform = 'scale(1)';
              }}>
              تعرف على خدماتنا
              <span style={{ fontSize: '1.3rem' }}>←</span>
            </button>

            {/* Right Button - Golden/Orange gradient exactly like image */}
            <button
              style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                borderRadius: '1rem',
                cursor: 'pointer',
                minWidth: '240px',
                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                border: 'none',
                fontFamily: 'Amiri, serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(251, 191, 36, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(251, 191, 36, 0.3)';
              }}>
              <span style={{ fontSize: '1.3rem' }}>✨</span>
              ابدأ القراءة الآن
            </button>
          </div>

          {/* Feature Cards - Matching dark glass effect from image */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
            gap: '1.5rem',
            width: '100%',
            maxWidth: '1000px'
          }}>
            {/* Expert Readers Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              padding: '2rem',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>👥</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#fbbf24',
                marginBottom: '0.75rem',
                fontFamily: 'Amiri, serif'
              }}>
                خبراء معتمدون
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                fontFamily: 'Amiri, serif'
              }}>
                قراء محترفون ذوو خبرة عالية
              </p>
            </div>

            {/* 24/7 Service Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              padding: '2rem',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>🕐</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#fbbf24',
                marginBottom: '0.75rem',
                fontFamily: 'Amiri, serif'
              }}>
                متاح 24/7
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                fontFamily: 'Amiri, serif'
              }}>
                خدمة متواصلة في أي وقت
              </p>
            </div>

            {/* Secure & Confidential Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              padding: '2rem',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>🛡️</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#fbbf24',
                marginBottom: '0.75rem',
                fontFamily: 'Amiri, serif'
              }}>
                آمن ومضمون
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                fontFamily: 'Amiri, serif'
              }}>
                خصوصية تامة وحماية معلوماتك
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}