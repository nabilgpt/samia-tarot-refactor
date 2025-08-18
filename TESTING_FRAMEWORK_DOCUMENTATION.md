# SAMIA TAROT - Testing Framework Documentation

## Overview
The SAMIA TAROT platform implements a comprehensive testing framework ensuring code quality, reliability, and maintainability across all system components. This documentation covers unit testing, integration testing, end-to-end testing, and quality assurance procedures.

## Table of Contents
1. [Testing Strategy](#testing-strategy)
2. [Testing Tools & Setup](#testing-tools--setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [Component Testing](#component-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Test Coverage](#test-coverage)
10. [CI/CD Integration](#cicd-integration)
11. [Testing Best Practices](#testing-best-practices)
12. [Troubleshooting](#troubleshooting)

## Testing Strategy

### Testing Pyramid
```
    /\
   /  \     E2E Tests (Few, High-level)
  /____\
 /      \   Integration Tests (Some, API/DB)
/________\  Unit Tests (Many, Fast, Isolated)
```

### Testing Levels
- **Unit Tests (70%)**: Individual functions and components
- **Integration Tests (20%)**: API endpoints, database operations, service integration
- **End-to-End Tests (10%)**: Complete user workflows

### Testing Philosophy
- **Test-Driven Development (TDD)**: Write tests before implementation
- **Behavior-Driven Development (BDD)**: Focus on user behavior and business requirements
- **Continuous Testing**: Automated testing in CI/CD pipeline
- **Risk-Based Testing**: Prioritize testing based on business impact

## Testing Tools & Setup

### Core Testing Framework
```json
{
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^30.0.0",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.6.1"
}
```

### Testing Configuration
```javascript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.stories.{js,jsx}',
    '!src/**/*.test.{js,jsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Environment Setup
```javascript
// src/setupTests.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key';

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
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children
}));
```

## Unit Testing

### Component Testing Example
```javascript
// src/__tests__/components/CosmicButton.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CosmicButton from '../../components/UI/CosmicButton';

describe('CosmicButton', () => {
  test('renders with correct text', () => {
    render(<CosmicButton>Click me</CosmicButton>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<CosmicButton onClick={handleClick}>Click me</CosmicButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies variant styling', () => {
    render(<CosmicButton variant="primary">Primary Button</CosmicButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-cosmic-600');
  });

  test('handles disabled state', () => {
    render(<CosmicButton disabled>Disabled Button</CosmicButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
  });
});
```

### Service Testing Example
```javascript
// src/__tests__/services/authService.test.js
import { authService } from '../../services/authService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('successful login returns user data', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await authService.login('test@example.com', 'password');
      
      expect(result.user).toEqual(mockUser);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });

    test('failed login throws error', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' }
      });

      await expect(authService.login('test@example.com', 'wrong'))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Utility Function Testing
```javascript
// src/__tests__/utils/validation.test.js
import { validateEmail, validatePassword, validatePhone } from '../../utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    test('validates correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
    });

    test('rejects invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('validates strong passwords', () => {
      expect(validatePassword('StrongP@ss123')).toBe(true);
      expect(validatePassword('Complex!Password1')).toBe(true);
    });

    test('rejects weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
      expect(validatePassword('password')).toBe(false);
    });
  });
});
```

## Integration Testing

### API Integration Tests
```javascript
// src/__tests__/integration/api.test.js
import request from 'supertest';
import app from '../../api/app';
import { supabase } from '../../lib/supabase';

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestDatabase();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register creates new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    test('POST /api/auth/login authenticates user', async () => {
      // First create a user
      await createTestUser('test@example.com', 'password123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('Protected Endpoints', () => {
    let authToken;

    beforeEach(async () => {
      const user = await createTestUser('auth@example.com', 'password123');
      authToken = generateTestToken(user.id);
    });

    test('GET /api/profile requires authentication', async () => {
      await request(app)
        .get('/api/profile')
        .expect(401);
    });

    test('GET /api/profile returns user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe('auth@example.com');
    });
  });
});
```

### Database Integration Tests
```javascript
// src/__tests__/integration/database.test.js
import { supabase } from '../../lib/supabase';

describe('Database Integration', () => {
  describe('User Operations', () => {
    test('creates user with profile', async () => {
      const userData = {
        email: 'dbtest@example.com',
        first_name: 'Database',
        last_name: 'Test',
        role: 'client'
      };

      const { data: user, error } = await supabase
        .from('profiles')
        .insert(userData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe('client');
    });

    test('enforces unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        first_name: 'First',
        last_name: 'User'
      };

      // Insert first user
      await supabase.from('profiles').insert(userData);

      // Try to insert duplicate
      const { error } = await supabase
        .from('profiles')
        .insert(userData);

      expect(error).toBeDefined();
      expect(error.code).toBe('23505'); // Unique violation
    });
  });

  describe('RLS Policies', () => {
    test('users can only access their own data', async () => {
      const user1 = await createTestUser('user1@example.com');
      const user2 = await createTestUser('user2@example.com');

      // User 1 tries to access User 2's data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user2.id)
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });
  });
});
```

## Component Testing

### React Component Testing
```javascript
// src/__tests__/components/TarotCard.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TarotCard from '../../components/Tarot/TarotCard';
import { TarotProvider } from '../../context/TarotContext';

const MockTarotProvider = ({ children }) => (
  <TarotProvider>
    {children}
  </TarotProvider>
);

describe('TarotCard Component', () => {
  const mockCard = {
    id: 1,
    name: 'The Fool',
    image_url: '/cards/fool.jpg',
    meaning: 'New beginnings',
    reversed_meaning: 'Recklessness'
  };

  test('renders card correctly', () => {
    render(
      <MockTarotProvider>
        <TarotCard card={mockCard} />
      </MockTarotProvider>
    );

    expect(screen.getByText('The Fool')).toBeInTheDocument();
    expect(screen.getByAltText('The Fool')).toBeInTheDocument();
  });

  test('handles card flip animation', async () => {
    render(
      <MockTarotProvider>
        <TarotCard card={mockCard} flippable />
      </MockTarotProvider>
    );

    const card = screen.getByTestId('tarot-card');
    fireEvent.click(card);

    await waitFor(() => {
      expect(card).toHaveClass('flipped');
    });
  });

  test('shows meaning on hover', async () => {
    render(
      <MockTarotProvider>
        <TarotCard card={mockCard} showMeaning />
      </MockTarotProvider>
    );

    const card = screen.getByTestId('tarot-card');
    fireEvent.mouseEnter(card);

    await waitFor(() => {
      expect(screen.getByText('New beginnings')).toBeInTheDocument();
    });
  });
});
```

### Context Testing
```javascript
// src/__tests__/context/AuthContext.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

const TestComponent = () => {
  const { user, login, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <div>
          <span>Welcome, {user.email}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => login('test@example.com', 'password')}>
          Login
        </button>
      )}
    </div>
  );
};

describe('AuthContext', () => {
  test('provides authentication state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('handles login flow', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
    });
  });
});
```

## End-to-End Testing

### Playwright E2E Tests
```javascript
// tests/e2e/user-journey.spec.js
import { test, expect } from '@playwright/test';

test.describe('User Journey', () => {
  test('complete booking flow', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Register new user
    await page.click('[data-testid="register-button"]');
    await page.fill('[data-testid="email-input"]', 'e2e@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="first-name-input"]', 'E2E');
    await page.fill('[data-testid="last-name-input"]', 'Test');
    await page.click('[data-testid="submit-registration"]');

    // Verify registration success
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Navigate to services
    await page.click('[data-testid="services-nav"]');
    
    // Select a service
    await page.click('[data-testid="service-card"]:first-child');
    
    // Book the service
    await page.click('[data-testid="book-now-button"]');
    
    // Fill booking form
    await page.fill('[data-testid="booking-notes"]', 'E2E test booking');
    await page.click('[data-testid="confirm-booking"]');

    // Verify booking creation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
  });

  test('reader workflow', async ({ page }) => {
    // Login as reader
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'reader@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Navigate to dashboard
    await page.click('[data-testid="dashboard-nav"]');

    // Check pending bookings
    await expect(page.locator('[data-testid="pending-bookings"]')).toBeVisible();

    // Accept a booking
    await page.click('[data-testid="accept-booking"]:first-child');

    // Verify booking status update
    await expect(page.locator('[data-testid="accepted-bookings"]')).toBeVisible();
  });
});
```

### E2E Test Configuration
```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

## Performance Testing

### Load Testing
```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady state
    { duration: '2m', target: 200 }, // Spike
    { duration: '5m', target: 200 }, // Steady spike
    { duration: '2m', target: 0 }    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests under 1.5s
    http_req_failed: ['rate<0.1']      // Error rate under 10%
  }
};

export default function() {
  // Test API endpoints
  let response = http.get('https://api.samia-tarot.com/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });

  // Test authentication
  response = http.post('https://api.samia-tarot.com/auth/login', {
    email: 'loadtest@example.com',
    password: 'password123'
  });
  
  check(response, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined
  });

  sleep(1);
}
```

### Frontend Performance Testing
```javascript
// tests/performance/lighthouse.js
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port
  };

  const runnerResult = await lighthouse('http://localhost:3000', options);

  // Performance assertions
  const { lhr } = runnerResult;
  const performanceScore = lhr.categories.performance.score * 100;
  const accessibilityScore = lhr.categories.accessibility.score * 100;

  console.log(`Performance Score: ${performanceScore}`);
  console.log(`Accessibility Score: ${accessibilityScore}`);

  // Assert minimum scores
  if (performanceScore < 80) {
    throw new Error(`Performance score ${performanceScore} below threshold of 80`);
  }
  
  if (accessibilityScore < 90) {
    throw new Error(`Accessibility score ${accessibilityScore} below threshold of 90`);
  }

  await chrome.kill();
}

runLighthouse().catch(console.error);
```

## Security Testing

### Authentication Security Tests
```javascript
// src/__tests__/security/auth-security.test.js
import request from 'supertest';
import app from '../../api/app';

describe('Authentication Security', () => {
  test('prevents SQL injection in login', async () => {
    const maliciousPayload = {
      email: "admin@example.com'; DROP TABLE users; --",
      password: 'password'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(maliciousPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid input');
  });

  test('prevents brute force attacks', async () => {
    const loginAttempts = Array(11).fill().map(() =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
    );

    const responses = await Promise.all(loginAttempts);
    const lastResponse = responses[responses.length - 1];

    expect(lastResponse.status).toBe(429); // Too Many Requests
  });

  test('validates JWT tokens properly', async () => {
    const invalidToken = 'invalid.jwt.token';

    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(response.status).toBe(401);
  });
});
```

### Input Validation Tests
```javascript
// src/__tests__/security/validation.test.js
import { validateUserInput, sanitizeInput } from '../../utils/security';

describe('Input Validation', () => {
  test('sanitizes HTML input', () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const sanitized = sanitizeInput(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });

  test('validates email format strictly', () => {
    const testCases = [
      { input: 'valid@example.com', expected: true },
      { input: 'invalid-email', expected: false },
      { input: 'test@', expected: false },
      { input: '@domain.com', expected: false },
      { input: 'test@domain', expected: false }
    ];

    testCases.forEach(({ input, expected }) => {
      expect(validateUserInput.email(input)).toBe(expected);
    });
  });

  test('prevents path traversal attacks', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32',
      '%2e%2e%2f%2e%2e%2f',
      'normal-file.txt'
    ];

    maliciousPaths.forEach(path => {
      const isValid = validateUserInput.filename(path);
      if (path === 'normal-file.txt') {
        expect(isValid).toBe(true);
      } else {
        expect(isValid).toBe(false);
      }
    });
  });
});
```

## Test Coverage

### Coverage Configuration
```javascript
// jest.config.js (coverage section)
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.stories.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/test-utils/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary']
};
```

### Coverage Scripts
```json
{
  "scripts": {
    "test:coverage": "jest --coverage",
    "test:coverage:watch": "jest --coverage --watchAll",
    "test:coverage:ci": "jest --coverage --ci --watchman=false",
    "coverage:open": "open coverage/lcov-report/index.html"
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:coverage
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true
      
      - name: Run E2E tests
        run: |
          npm run build
          npm run preview &
          npx wait-on http://localhost:4173
          npx playwright test
        env:
          CI: true
```

### Quality Gates
```javascript
// scripts/quality-gate.js
const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

const thresholds = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80
};

let failed = false;

Object.entries(thresholds).forEach(([metric, threshold]) => {
  const actual = coverage.total[metric].pct;
  if (actual < threshold) {
    console.error(`❌ ${metric} coverage ${actual}% below threshold ${threshold}%`);
    failed = true;
  } else {
    console.log(`✅ ${metric} coverage ${actual}% meets threshold ${threshold}%`);
  }
});

if (failed) {
  console.error('\n❌ Quality gate failed - coverage below thresholds');
  process.exit(1);
} else {
  console.log('\n✅ Quality gate passed - all coverage thresholds met');
}
```

## Testing Best Practices

### Writing Effective Tests
1. **Arrange, Act, Assert (AAA) Pattern**
```javascript
test('should calculate total price correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  const taxRate = 0.1;
  
  // Act
  const total = calculateTotal(items, taxRate);
  
  // Assert
  expect(total).toBe(33); // (10 + 20) * 1.1
});
```

2. **Test Naming Convention**
```javascript
// Good: Descriptive test names
test('should return user profile when valid token provided');
test('should throw error when invalid email format provided');

// Bad: Vague test names
test('login test');
test('validation');
```

3. **Mock External Dependencies**
```javascript
// Mock API calls
jest.mock('../../services/api', () => ({
  fetchUserData: jest.fn().mockResolvedValue({ id: 1, name: 'Test' })
}));

// Mock timers
jest.useFakeTimers();
```

4. **Test Edge Cases**
```javascript
describe('validateAge', () => {
  test('handles boundary values', () => {
    expect(validateAge(17)).toBe(false); // Just under 18
    expect(validateAge(18)).toBe(true);  // Exactly 18
    expect(validateAge(120)).toBe(true); // Very old but valid
    expect(validateAge(121)).toBe(false); // Too old
  });
  
  test('handles invalid inputs', () => {
    expect(validateAge(-1)).toBe(false);
    expect(validateAge(null)).toBe(false);
    expect(validateAge(undefined)).toBe(false);
    expect(validateAge('18')).toBe(false); // String instead of number
  });
});
```

### Test Organization
```
src/
├── __tests__/
│   ├── components/
│   │   ├── UI/
│   │   │   ├── CosmicButton.test.js
│   │   │   └── CosmicCard.test.js
│   │   └── Tarot/
│   │       └── TarotCard.test.js
│   ├── services/
│   │   ├── authService.test.js
│   │   └── tarotService.test.js
│   ├── utils/
│   │   ├── validation.test.js
│   │   └── formatting.test.js
│   ├── integration/
│   │   ├── api.test.js
│   │   └── database.test.js
│   └── security/
│       ├── auth-security.test.js
│       └── validation.test.js
└── test-utils/
    ├── test-helpers.js
    ├── mock-data.js
    └── setup.js
```

## Troubleshooting

### Common Testing Issues

#### 1. Test Timeouts
```javascript
// Increase timeout for slow operations
test('slow database operation', async () => {
  const result = await slowDatabaseQuery();
  expect(result).toBeDefined();
}, 10000); // 10 second timeout
```

#### 2. Async Testing Issues
```javascript
// Use waitFor for async updates
test('async state update', async () => {
  render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

#### 3. Mock Cleanup
```javascript
describe('Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    cleanup();
  });
});
```

#### 4. Environment Variable Issues
```javascript
// Mock environment variables in tests
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    VITE_API_URL: 'http://test-api.com'
  };
});

afterEach(() => {
  process.env = originalEnv;
});
```

### Debugging Tests
```javascript
// Add debug utilities
import { screen, debug } from '@testing-library/react';

test('debug failing test', () => {
  render(<MyComponent />);
  
  // Print current DOM
  screen.debug();
  
  // Print specific element
  const button = screen.getByRole('button');
  debug(button);
});
```

### Performance Optimization
```javascript
// Use fake timers for timer-based tests
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('timer functionality', () => {
  const callback = jest.fn();
  setTimeout(callback, 1000);
  
  jest.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

## Test Scripts

### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchman=false",
    "test:unit": "jest --testPathPattern=__tests__/(?!integration)",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:security": "jest --testPathPattern=security",
    "test:performance": "k6 run tests/performance/load-test.js",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

## Conclusion

The SAMIA TAROT testing framework provides comprehensive coverage across all application layers, ensuring reliability, security, and performance. The framework supports:

- **Multi-level Testing**: Unit, integration, and E2E tests
- **Security Testing**: Authentication, input validation, and vulnerability testing
- **Performance Testing**: Load testing and performance monitoring
- **CI/CD Integration**: Automated testing in deployment pipeline
- **Quality Gates**: Coverage thresholds and quality metrics

This testing strategy ensures the platform maintains high quality standards while enabling confident deployment and continuous development.

---

**Framework Status**: ✅ Active  
**Last Updated**: December 2024  
**Maintained By**: SAMIA TAROT Development Team  
**Next Review**: Quarterly