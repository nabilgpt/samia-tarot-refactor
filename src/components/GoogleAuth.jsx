import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uusefmlielktdcltzwzt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL3N1cGFiYXNlLmNvbS9qd3Qvc2NvcGVzIjpbImF1dGgiXSwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg0MDk3MDcsImV4cCI6MjAwMDAwMDAwMH0.JfSt1aI8mJQ4GuCPrlIxw3htv6yE-0Ajl-JbixcM1UA'
);

const GoogleAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setMessage('Successfully signed in!');
      } else {
        setUser(null);
        setMessage('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Redirecting to Google...');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(`Error signing out: ${error.message}`);
    } else {
      setUser(null);
      setMessage('Signed out successfully');
    }
  };

  if (user) {
    return (
      <div style={{
        maxWidth: '400px',
        margin: '50px auto',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h2>Welcome!</h2>
        <img 
          src={user.user_metadata?.avatar_url} 
          alt="Profile" 
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            margin: '10px 0'
          }}
        />
        <p><strong>Name:</strong> {user.user_metadata?.full_name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Provider:</strong> {user.app_metadata?.provider}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        
        <button 
          onClick={signOut}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            marginTop: '15px'
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '400px',
      margin: '50px auto',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <h2>Google Authentication</h2>
      
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: loading ? '#6c757d' : '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </button>

      {message && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default GoogleAuth; 