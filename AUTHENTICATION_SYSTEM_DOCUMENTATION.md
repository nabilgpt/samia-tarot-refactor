# SAMIA TAROT - Authentication System Documentation

## Overview
The SAMIA TAROT platform implements a comprehensive JWT-based authentication system with role-based access control (RBAC), supporting multiple user roles and secure session management.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication Flow](#authentication-flow)
4. [JWT Implementation](#jwt-implementation)
5. [Session Management](#session-management)
6. [Security Features](#security-features)
7. [API Endpoints](#api-endpoints)
8. [Frontend Integration](#frontend-integration)
9. [Database Schema](#database-schema)
10. [Configuration](#configuration)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Components
- **Frontend**: React with AuthContext for state management
- **Backend**: Express.js with JWT middleware
- **Database**: Supabase with Row Level Security (RLS)
- **Session Storage**: localStorage with secure token handling

### Flow Diagram
```
Client → Login Request → Backend Auth → JWT Generation → Token Storage → Protected Routes
```

## User Roles & Permissions

### Role Hierarchy
1. **Client** - Basic user with booking and reading access
2. **Reader** - Tarot card readers with session management
3. **Admin** - Platform administrators with user management
4. **Monitor** - Monitoring and analytics access
5. **Super Admin** - Full system access and configuration

### Permission Matrix
| Feature | Client | Reader | Admin | Monitor | Super Admin |
|---------|--------|--------|-------|---------|-------------|
| Book Sessions | ✅ | ❌ | ✅ | ❌ | ✅ |
| Conduct Readings | ❌ | ✅ | ❌ | ❌ | ✅ |
| User Management | ❌ | ❌ | ✅ | ❌ | ✅ |
| Analytics View | ❌ | ❌ | ✅ | ✅ | ✅ |
| System Config | ❌ | ❌ | ❌ | ❌ | ✅ |

## Authentication Flow

### 1. Registration Process
```javascript
// Registration endpoint
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securePassword",
  "full_name": "John Doe",
  "role": "client"
}
```

### 2. Login Process
```javascript
// Login endpoint
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "client",
    "full_name": "John Doe"
  }
}
```

### 3. Token Validation
```javascript
// Protected route access
GET /api/protected-resource
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## JWT Implementation

### Token Structure
```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "client",
    "iat": 1640995200,
    "exp": 1641081600
  }
}
```

### Token Generation
```javascript
// Backend: src/api/middleware/auth.js
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};
```

### Token Verification
```javascript
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Session Management

### Frontend Context
```javascript
// src/context/AuthContext.jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateToken(token);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    localStorage.setItem('token', response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Token Storage
- **Storage Method**: localStorage
- **Expiration**: 24 hours
- **Refresh**: Automatic on app load
- **Cleanup**: On logout or token expiration

## Security Features

### 1. Password Security
- **Hashing**: bcrypt with salt rounds
- **Minimum Requirements**: 8 characters, mixed case, numbers
- **Storage**: Never stored in plaintext

### 2. JWT Security
- **Secret**: Environment variable (JWT_SECRET)
- **Expiration**: 24-hour sliding window
- **Signing Algorithm**: HS256

### 3. Route Protection
```javascript
// Protected route wrapper
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

### 4. Database Security
- **Row Level Security (RLS)**: Enabled on all tables
- **Role-based Policies**: Restrict data access by user role
- **SQL Injection Prevention**: Parameterized queries

## API Endpoints

### Authentication Routes
```javascript
// src/api/routes/authRoutes.js

// Register new user
POST /api/auth/register
Body: { email, password, full_name, role }
Response: { message, user }

// Login user
POST /api/auth/login
Body: { email, password }
Response: { token, user }

// Logout user
POST /api/auth/logout
Headers: { Authorization: Bearer token }
Response: { message }

// Validate token
GET /api/auth/validate
Headers: { Authorization: Bearer token }
Response: { user }

// Refresh token
POST /api/auth/refresh
Headers: { Authorization: Bearer token }
Response: { token, user }

// Change password
PUT /api/auth/change-password
Headers: { Authorization: Bearer token }
Body: { currentPassword, newPassword }
Response: { message }

// Reset password request
POST /api/auth/forgot-password
Body: { email }
Response: { message }

// Reset password confirm
POST /api/auth/reset-password
Body: { token, newPassword }
Response: { message }
```

### Role-based Endpoints
```javascript
// Admin only
GET /api/admin/*
Headers: { Authorization: Bearer token }
Middleware: requireRole('admin', 'super_admin')

// Reader only
GET /api/reader/*
Headers: { Authorization: Bearer token }
Middleware: requireRole('reader', 'admin', 'super_admin')
```

## Frontend Integration

### 1. Auth Hook Usage
```javascript
// Custom hook for authentication
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Component usage
const Dashboard = () => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <h1>Welcome, {user.full_name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### 2. API Service Integration
```javascript
// src/services/api.js
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);
```

### 3. Route Protection
```javascript
// App.jsx routing
<Routes>
  <Route path="/auth" element={<AuthPage />} />
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
  <Route path="/admin" element={
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  } />
</Routes>
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'client',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  profile_image_url TEXT,
  phone_number VARCHAR(20),
  date_of_birth DATE,
  timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
```

### Sessions Table
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Index for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

## Configuration

### Environment Variables
```bash
# Backend (.env)
JWT_SECRET=your-super-secret-jwt-key-256-bits
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_JWT_STORAGE_KEY=samia_tarot_token
```

### Security Configuration
```javascript
// src/api/config/security.js
module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256'
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT) || 86400000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
};
```

## Testing

### Unit Tests
```javascript
// src/__tests__/auth.test.js
describe('Authentication Service', () => {
  test('should generate valid JWT token', () => {
    const user = { id: '123', email: 'test@example.com', role: 'client' };
    const token = generateToken(user);
    
    expect(token).toBeDefined();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe('123');
  });

  test('should validate token correctly', () => {
    const validToken = 'valid-jwt-token';
    const result = verifyToken(validToken);
    expect(result).toBeTruthy();
  });

  test('should reject invalid token', () => {
    const invalidToken = 'invalid-token';
    expect(() => verifyToken(invalidToken)).toThrow();
  });
});
```

### Integration Tests
```javascript
// src/__tests__/auth-integration.test.js
describe('Auth API Integration', () => {
  test('POST /api/auth/login - valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe('test@example.com');
  });

  test('GET /api/auth/validate - valid token', async () => {
    const token = generateTestToken();
    
    const response = await request(app)
      .get('/api/auth/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Token Validation Failures
**Symptoms**: 401 Unauthorized errors
**Causes**:
- JWT_SECRET mismatch between frontend/backend
- Token expiration
- Malformed token

**Solutions**:
```javascript
// Check token in localStorage
const token = localStorage.getItem('token');
console.log('Token:', token);

// Verify token manually
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Decoded:', decoded);
} catch (error) {
  console.error('Token invalid:', error.message);
}
```

#### 2. Role Access Issues
**Symptoms**: 403 Forbidden errors
**Causes**:
- Incorrect role assignment
- Missing role middleware
- Database permission issues

**Solutions**:
```javascript
// Check user role
console.log('User role:', user.role);

// Verify role middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

#### 3. Session Persistence Issues
**Symptoms**: User logged out on refresh
**Causes**:
- localStorage cleared
- Token not being set
- Context not initialized

**Solutions**:
```javascript
// Debug session persistence
useEffect(() => {
  const token = localStorage.getItem('token');
  console.log('Stored token:', token);
  
  if (token) {
    // Validate and set user
    validateToken(token);
  }
}, []);
```

### Debug Commands
```bash
# Check JWT secret
echo $JWT_SECRET

# Test API endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Validate token
curl -X GET http://localhost:5000/api/auth/validate \
  -H "Authorization: Bearer your-token-here"
```

### Performance Monitoring
```javascript
// Token validation timing
console.time('token-validation');
const isValid = verifyToken(token);
console.timeEnd('token-validation');

// Database query performance
console.time('user-lookup');
const user = await getUserById(userId);
console.timeEnd('user-lookup');
```

## Best Practices

1. **Never expose JWT secret** in frontend code
2. **Use HTTPS** in production for token transmission
3. **Implement token refresh** for long-lived sessions
4. **Log authentication events** for security monitoring
5. **Use strong passwords** with proper validation
6. **Implement rate limiting** on auth endpoints
7. **Regular security audits** of authentication flow
8. **Keep dependencies updated** for security patches

## Future Enhancements

1. **Multi-factor Authentication (MFA)**
2. **OAuth integration** (Google, Facebook)
3. **Biometric authentication** for mobile
4. **Session management dashboard**
5. **Advanced fraud detection**
6. **Single Sign-On (SSO)** capabilities

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 