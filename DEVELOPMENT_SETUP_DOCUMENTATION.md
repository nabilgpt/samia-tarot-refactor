# SAMIA TAROT - Development Setup Documentation

## Overview
This documentation provides a comprehensive guide for setting up the SAMIA TAROT development environment, including prerequisites, installation steps, configuration, and development workflows.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Environment Configuration](#environment-configuration)
5. [Development Tools](#development-tools)
6. [Database Setup](#database-setup)
7. [Development Workflow](#development-workflow)
8. [Code Standards](#code-standards)
9. [Testing Setup](#testing-setup)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: Latest version
- **VS Code**: Recommended IDE
- **Operating System**: Windows 10+, macOS 10.15+, or Linux

### Required Accounts
- **GitHub**: For code repository access
- **Supabase**: For database and authentication
- **Stripe**: For payment processing (development keys)
- **OpenAI**: For AI features (optional for basic development)

### Recommended Tools
- **Postman**: API testing
- **Docker**: Containerization (optional)
- **Git Kraken**: Git GUI (optional)

## Quick Start

### 1. Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-org/samia-tarot.git
cd samia-tarot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

### 2. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: Supabase Dashboard

## Detailed Setup

### Step 1: Environment Setup

#### Install Node.js
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be 18.x.x
npm --version   # Should be 8.x.x
```

#### Install Git
```bash
# macOS (using Homebrew)
brew install git

# Ubuntu/Debian
sudo apt update
sudo apt install git

# Windows (download from git-scm.com)
# Or use Windows Subsystem for Linux (WSL)
```

### Step 2: Project Setup

#### Clone and Install
```bash
# Clone repository
git clone https://github.com/your-org/samia-tarot.git
cd samia-tarot

# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Verify installation
npm run health:check
```

#### Project Structure
```
samia-tarot/
├── src/                    # Frontend source code
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── context/          # React contexts
│   ├── services/         # API services
│   ├── utils/            # Utility functions
│   └── styles/           # CSS and styling
├── backend/              # Backend API
│   ├── src/              # Backend source
│   ├── routes/           # API routes
│   └── middleware/       # Express middleware
├── database/             # Database schemas and migrations
├── public/               # Static assets
├── docs/                 # Documentation
└── scripts/              # Build and deployment scripts
```

## Environment Configuration

### Environment Variables Setup

#### Create Environment File
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit with your configuration
nano .env.local  # or use your preferred editor
```

#### Required Environment Variables
```bash
# Core Configuration
NODE_ENV=development
VITE_APP_ENV=development

# Frontend URLs
VITE_API_URL=http://localhost:5000
VITE_APP_URL=http://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Configuration (backend/.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Payment Gateways (Development)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Optional Services
VITE_OPENAI_API_KEY=sk-your_openai_api_key_for_ai_features
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### Environment Validation
```javascript
// scripts/validate-env.js
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}
```

## Development Tools

### VS Code Setup

#### Recommended Extensions
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "github.copilot",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "tailwindCSS.includeLanguages": {
    "javascript": "javascript",
    "html": "html"
  }
}
```

### Git Configuration
```bash
# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up Git hooks
npm run prepare  # Installs husky hooks

# Configure Git aliases (optional)
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run frontend\" \"npm run backend\"",
    "frontend": "vite",
    "backend": "cd backend && npm run dev",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ --ext .js,.jsx",
    "lint:fix": "eslint src/ --ext .js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,css,md}\"",
    "type-check": "tsc --noEmit",
    "health:check": "node scripts/health-check.js"
  }
}
```

## Database Setup

### Supabase Configuration

#### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to your project
supabase link --project-ref your-project-ref
```

#### 2. Database Schema Setup
```sql
-- Run in Supabase SQL Editor
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'client',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### 3. Run Migrations
```bash
# Apply database migrations
supabase db push

# Seed development data
npm run db:seed
```

### Local Database (Optional)
```bash
# Start local Supabase
supabase start

# Reset local database
supabase db reset

# Generate types
supabase gen types typescript --local > src/types/supabase.ts
```

## Development Workflow

### Branch Strategy
```bash
# Main branches
main        # Production-ready code
develop     # Integration branch
feature/*   # Feature development
hotfix/*    # Production hotfixes

# Example workflow
git checkout develop
git pull origin develop
git checkout -b feature/user-authentication
# ... make changes ...
git add .
git commit -m "feat: implement user authentication"
git push origin feature/user-authentication
# Create pull request to develop
```

### Commit Convention
```bash
# Commit message format
type(scope): description

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes
refactor: Code refactoring
test:     Adding tests
chore:    Build process or auxiliary tool changes

# Examples
feat(auth): add user registration
fix(payment): resolve stripe webhook issue
docs(api): update endpoint documentation
```

### Development Process
1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop & Test**
   ```bash
   npm run dev          # Start development server
   npm run test:watch   # Run tests in watch mode
   npm run lint         # Check code quality
   ```

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: implement new feature"
   ```

4. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## Code Standards

### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    'react/prop-types': 'off',
    'no-unused-vars': 'warn',
    'no-console': 'warn'
  }
};
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### File Naming Conventions
```
Components:     PascalCase (UserProfile.jsx)
Pages:          PascalCase (DashboardPage.jsx)
Utilities:      camelCase (formatDate.js)
Constants:      UPPER_SNAKE_CASE (API_ENDPOINTS.js)
Styles:         kebab-case (user-profile.css)
```

### Component Structure
```jsx
// Good component structure
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './UserProfile.css';

const UserProfile = ({ userId, onUpdate }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Fetch user data
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="user-profile"
    >
      {/* Component content */}
    </motion.div>
  );
};

UserProfile.propTypes = {
  userId: PropTypes.string.isRequired,
  onUpdate: PropTypes.func
};

export default UserProfile;
```

## Testing Setup

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Test Setup File
```javascript
// src/setupTests.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Supabase
vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test UserProfile.test.js

# Run tests matching pattern
npm test --testNamePattern="should render"
```

## Troubleshooting

### Common Issues

#### 1. Node Version Issues
```bash
# Check Node version
node --version

# Switch to correct version
nvm use 18

# Install correct version if needed
nvm install 18
```

#### 2. Dependency Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for vulnerabilities
npm audit
npm audit fix
```

#### 3. Environment Variable Issues
```bash
# Verify environment variables are loaded
node -e "console.log(process.env.VITE_SUPABASE_URL)"

# Check .env file exists and has correct format
cat .env.local

# Restart development server after env changes
npm run dev
```

#### 4. Database Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     "https://YOUR_PROJECT.supabase.co/rest/v1/profiles?select=*"

# Check Supabase project status
supabase status
```

#### 5. Port Conflicts
```bash
# Check what's running on port 3000
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Use different port
PORT=3001 npm run dev
```

### Development Tips

#### Hot Reload Issues
```bash
# If hot reload stops working
# 1. Restart development server
npm run dev

# 2. Clear browser cache
# 3. Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Performance Issues
```bash
# Monitor bundle size
npm run build
npm run analyze

# Check for memory leaks
node --inspect-brk node_modules/.bin/vite

# Profile React components
# Add ?react_perf to URL in development
```

### Getting Help

#### Documentation
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

#### Team Resources
- **Slack Channel**: #samia-tarot-dev
- **GitHub Issues**: For bug reports and feature requests
- **Team Wiki**: Internal documentation
- **Code Reviews**: Required for all pull requests

#### Debugging Tools
```javascript
// React Developer Tools
// Install browser extension

// Redux DevTools (if using Redux)
// Install browser extension

// Console debugging
console.log('Debug info:', { variable });
console.table(arrayData);
console.time('operation');
// ... code ...
console.timeEnd('operation');
```

## Development Checklist

### Before Starting Development
- [ ] Node.js 18+ installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database connected
- [ ] Development server running

### Before Committing
- [ ] Code linted and formatted
- [ ] Tests passing
- [ ] No console errors
- [ ] Environment variables not committed
- [ ] Commit message follows convention

### Before Creating PR
- [ ] Branch up to date with develop
- [ ] All tests passing
- [ ] Code reviewed locally
- [ ] Documentation updated
- [ ] Screenshots added (for UI changes)

---

**Documentation Status**: ✅ Active  
**Last Updated**: December 2024  
**Maintained By**: SAMIA TAROT Development Team  
**Next Review**: Quarterly 