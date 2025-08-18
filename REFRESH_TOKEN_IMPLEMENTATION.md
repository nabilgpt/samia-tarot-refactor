# Robust Refresh Token Flow Implementation - SAMIA TAROT

## Overview
This document describes the implementation of a robust refresh token flow that automatically handles token expiry without forcing users to log in again. The system uses Supabase's built-in refresh token functionality with custom frontend interceptors.

## System Architecture

### Backend Implementation

#### 1. Auth Routes (`src/api/routes/authRoutes.js`)
- **POST /api/auth/refresh-token**: Refreshes access token using Supabase refresh token
- **POST /api/auth/validate-token**: Validates current access token
- **POST /api/auth/logout**: Logout and invalidate refresh token

#### 2. Enhanced Auth Middleware (`src/api/middleware/auth.js`)
- Better error messages for expired tokens
- Distinguishes between expired and invalid tokens
- Returns 401 for expired tokens (triggers refresh flow)

#### 3. Session Logging
- Tracks refresh token usage in `auth_sessions` table
- Logs login, logout, and refresh events
- IP address and user agent tracking for security

### Frontend Implementation

#### 1. Enhanced Frontend API Client (`src/services/frontendApi.js`)
- **Automatic Token Refresh**: Intercepts 401 responses and refreshes tokens
- **Preemptive Refresh**: Refreshes tokens before they expire (5-minute window)
- **Token Health Check**: Monitors token expiry status
- **Error Handling**: Graceful fallback and user notifications

#### 2. Updated Auth Context (`src/context/AuthContext.jsx`)
- **refreshAuthToken()**: Manual token refresh method
- **Integration**: Works with existing login/logout flow
- **State Management**: Updates user state after refresh

## Token Flow Process

### 1. Initial Authentication
```javascript
// User logs in
const { session, user } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Session contains:
// - access_token (short-lived, ~1 hour)
// - refresh_token (long-lived, ~7 days)
// - expires_at (expiration timestamp)
```

### 2. Automatic Refresh Flow
```javascript
// API request fails with 401
API Request → 401 Unauthorized → Refresh Token → Retry Request

// Detailed flow:
1. User makes API request
2. Backend returns 401 (token expired)
3. Frontend interceptor catches 401
4. Frontend calls refresh endpoint
5. New access token obtained
6. Original request retried with new token
7. User never notices the refresh
```

### 3. Preemptive Refresh
```javascript
// Before making API request
const tokenHealth = await checkTokenHealth();

if (tokenHealth.expiresSoon) {
  await refreshToken();
}

// Make API request with fresh token
```

## Key Features

### 1. Automatic Token Refresh
- **Transparent**: Users never see authentication errors
- **Efficient**: Only refreshes when necessary
- **Secure**: Uses Supabase's secure refresh mechanism

### 2. Preemptive Refresh
- **Smart Timing**: Refreshes 5 minutes before expiry
- **Performance**: Prevents API request failures
- **User Experience**: No interruptions

### 3. Error Handling
- **Graceful Degradation**: Falls back to login on refresh failure
- **User Notifications**: Clear messages about session expiry
- **Secure Logout**: Cleans up tokens on failure

### 4. Security Features
- **Session Logging**: Tracks all token operations
- **IP Tracking**: Monitors unusual activity
- **Token Rotation**: Supabase rotates refresh tokens
- **Secure Storage**: Tokens stored securely by Supabase

## Configuration

### Backend Environment Variables
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### Frontend Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Usage Examples

### 1. Manual Token Refresh
```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { refreshAuthToken } = useAuth();

  const handleRefresh = async () => {
    const result = await refreshAuthToken();
    if (result.success) {
      console.log('Token refreshed successfully');
    } else {
      console.error('Refresh failed:', result.error);
    }
  };

  return <button onClick={handleRefresh}>Refresh Token</button>;
};
```

### 2. Check Token Health
```javascript
import { checkTokenHealth } from '../services/frontendApi';

const checkHealth = async () => {
  const health = await checkTokenHealth();
  
  if (health.healthy) {
    console.log('Token is healthy');
  } else {
    console.log('Token issue:', health.reason);
  }
};
```

### 3. Direct API Usage
```javascript
import api from '../services/frontendApi';

// API calls automatically handle token refresh
const data = await api.get('/api/admin/users');
// If token is expired, it will be refreshed automatically
```

## Security Considerations

### 1. Token Expiry
- **Access Token**: 1 hour (configurable in Supabase)
- **Refresh Token**: 7 days (configurable in Supabase)
- **Session**: 24 hours of inactivity

### 2. Storage Security
- **Supabase Secure Storage**: Tokens stored in httpOnly cookies
- **No localStorage**: Prevents XSS attacks
- **Domain Restrictions**: Cookies bound to domain

### 3. Session Management
- **Automatic Cleanup**: Expired sessions removed
- **Activity Tracking**: All token operations logged
- **IP Monitoring**: Unusual activity detection

## Error Codes

### Backend Error Codes
- **AUTH_TOKEN_MISSING**: No token provided
- **AUTH_TOKEN_INVALID**: Invalid token format
- **AUTH_TOKEN_EXPIRED**: Token has expired
- **REFRESH_TOKEN_MISSING**: No refresh token provided
- **REFRESH_TOKEN_INVALID**: Invalid refresh token
- **PROFILE_NOT_FOUND**: User profile not found
- **ACCOUNT_DEACTIVATED**: Account is deactivated

### Frontend Error Handling
- **401 Responses**: Automatically trigger refresh
- **Refresh Failures**: Show user notification and redirect
- **Network Errors**: Graceful fallback with retry
- **Token Health**: Proactive monitoring

## Database Schema

### Auth Sessions Table
```sql
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  session_type TEXT NOT NULL, -- 'login', 'refresh', 'logout'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### 1. Manual Testing
- Login and wait for token to expire
- Make API request to verify refresh
- Test logout functionality
- Verify session logging

### 2. Automated Testing
- Unit tests for refresh functions
- Integration tests for API flow
- Security tests for token handling
- Performance tests for refresh speed

## Monitoring

### 1. Logs to Monitor
- Token refresh frequency
- Refresh failures
- Session creation/destruction
- Unusual IP activity

### 2. Metrics
- Refresh success rate
- Token expiry timing
- User session duration
- API request failure recovery

## Troubleshooting

### Common Issues
1. **Refresh Loop**: Check token expiry times
2. **401 Errors**: Verify backend middleware
3. **Session Loss**: Check Supabase configuration
4. **Redirect Issues**: Verify URL handling

### Debug Commands
```javascript
// Check current session
const { data } = await supabase.auth.getSession();
console.log('Session:', data);

// Check token health
const health = await checkTokenHealth();
console.log('Token Health:', health);

// Manual refresh
const result = await refreshToken();
console.log('Refresh Result:', result);
```

## Future Enhancements

### 1. Advanced Features
- **Token Rotation**: Automatic refresh token rotation
- **Device Management**: Track multiple devices
- **Session Limits**: Limit concurrent sessions
- **Suspicious Activity**: Advanced threat detection

### 2. Performance Optimizations
- **Token Caching**: Cache valid tokens
- **Batch Requests**: Group refresh operations
- **Background Refresh**: Refresh in service worker
- **Offline Support**: Handle offline scenarios

## Conclusion

This implementation provides a robust, secure, and user-friendly refresh token flow that:
- Automatically handles token expiry
- Provides transparent user experience
- Implements security best practices
- Includes comprehensive error handling
- Supports monitoring and debugging

The system is production-ready and follows industry standards for token management and security. 