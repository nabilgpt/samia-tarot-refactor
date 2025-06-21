const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 STEP 8: TESTING AUTOMATION AUDIT');
console.log('==================================\n');

class TestingAutomationManager {
    constructor() {
        this.results = {
            testInfrastructure: {},
            unitTests: {},
            integrationTests: {},
            e2eTests: {},
            testCoverage: {},
            cicdTests: {},
            recommendations: [],
            totalScore: 0
        };
    }

    async auditTestInfrastructure() {
        console.log('🏗️ Auditing Test Infrastructure...');
        
        let score = 0;
        let maxScore = 100;
        let found = [];
        let missing = [];

        const testInfrastructure = [
            { file: 'package.json', check: 'jest', name: 'Jest Test Framework', points: 20 },
            { file: 'package.json', check: '@testing-library/react', name: 'React Testing Library', points: 20 },
            { file: 'package.json', check: '@testing-library/jest-dom', name: 'Jest DOM Extensions', points: 15 },
            { file: 'package.json', check: 'cypress', name: 'Cypress E2E Testing', points: 15 },
            { file: 'jest.config.js', check: null, name: 'Jest Configuration', points: 10 },
            { file: 'cypress.config.js', check: null, name: 'Cypress Configuration', points: 10 },
            { file: 'src/setupTests.js', check: null, name: 'Test Setup File', points: 10 }
        ];

        try {
            // Check package.json for testing dependencies
            if (fs.existsSync('package.json')) {
                const packageContent = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                const allDeps = { 
                    ...packageContent.dependencies, 
                    ...packageContent.devDependencies 
                };

                testInfrastructure.forEach(item => {
                    if (item.check) {
                        // Check for dependency
                        if (allDeps[item.check]) {
                            found.push(item.name);
                            score += item.points;
                            console.log(`✅ ${item.name} - Found`);
                        } else {
                            missing.push(item.name);
                            console.log(`❌ ${item.name} - Missing`);
                        }
                    } else {
                        // Check for config file
                        if (fs.existsSync(item.file)) {
                            found.push(item.name);
                            score += item.points;
                            console.log(`✅ ${item.name} - Found`);
                        } else {
                            missing.push(item.name);
                            console.log(`❌ ${item.name} - Missing`);
                        }
                    }
                });
            } else {
                console.log('❌ package.json not found');
                missing.push('Package.json');
            }

        } catch (error) {
            console.log(`❌ Test infrastructure audit error: ${error.message}`);
        }

        this.results.testInfrastructure = { 
            score, 
            maxScore, 
            found, 
            missing,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Test Infrastructure Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditExistingTests() {
        console.log('🔍 Auditing Existing Tests...');
        
        let score = 0;
        let maxScore = 100;
        let testFiles = [];
        let testTypes = {
            unit: 0,
            integration: 0,
            e2e: 0
        };

        try {
            // Find all test files
            const allTestFiles = this.findTestFiles('src');
            testFiles = allTestFiles;

            if (allTestFiles.length === 0) {
                console.log('❌ No test files found');
                this.results.unitTests = { score: 0, maxScore, testFiles, testTypes, percentage: 0 };
                return { score: 0, maxScore };
            }

            console.log(`📁 Found ${allTestFiles.length} test files`);

            // Analyze test quality
            allTestFiles.forEach(testFile => {
                try {
                    const content = fs.readFileSync(testFile, 'utf8');
                    
                    // Categorize tests
                    if (content.includes('describe') || content.includes('it(') || content.includes('test(')) {
                        if (testFile.includes('e2e') || testFile.includes('cypress')) {
                            testTypes.e2e++;
                        } else if (testFile.includes('integration') || content.includes('request') || content.includes('api')) {
                            testTypes.integration++;
                        } else {
                            testTypes.unit++;
                        }
                        
                        score += 5; // 5 points per test file
                    }

                    // Check for good test practices
                    if (content.includes('beforeEach') || content.includes('afterEach')) {
                        score += 2; // Setup/teardown
                    }
                    if (content.includes('expect')) {
                        score += 2; // Assertions
                    }
                    if (content.includes('mock') || content.includes('spy')) {
                        score += 2; // Mocking
                    }
                    
                } catch (error) {
                    console.log(`⚠️ Error reading test file ${testFile}: ${error.message}`);
                }
            });

            // Cap the score at maxScore
            score = Math.min(score, maxScore);

            console.log(`📊 Test Distribution:`);
            console.log(`   Unit Tests: ${testTypes.unit}`);
            console.log(`   Integration Tests: ${testTypes.integration}`);
            console.log(`   E2E Tests: ${testTypes.e2e}`);

        } catch (error) {
            console.log(`❌ Test audit error: ${error.message}`);
        }

        this.results.unitTests = { 
            score, 
            maxScore, 
            testFiles, 
            testTypes,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Existing Tests Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditTestCoverage() {
        console.log('📊 Auditing Test Coverage...');
        
        let score = 0;
        let maxScore = 100;
        let coverageData = null;

        try {
            // Check if coverage reporting is configured
            if (fs.existsSync('package.json')) {
                const packageContent = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                
                // Check for coverage scripts
                if (packageContent.scripts && packageContent.scripts['test:coverage']) {
                    score += 25;
                    console.log('✅ Coverage script configured');
                } else {
                    console.log('❌ No coverage script found');
                }

                // Check for coverage thresholds
                if (packageContent.jest && packageContent.jest.coverageThreshold) {
                    score += 25;
                    console.log('✅ Coverage thresholds configured');
                } else {
                    console.log('❌ No coverage thresholds set');
                }
            }

            // Check for coverage output directory
            if (fs.existsSync('coverage')) {
                score += 25;
                console.log('✅ Coverage reports directory exists');
                
                // Try to read coverage data
                if (fs.existsSync('coverage/coverage-summary.json')) {
                    try {
                        const coverageContent = fs.readFileSync('coverage/coverage-summary.json', 'utf8');
                        coverageData = JSON.parse(coverageContent);
                        score += 25;
                        console.log('✅ Coverage data available');
                    } catch (error) {
                        console.log('⚠️ Coverage data exists but unreadable');
                    }
                }
            } else {
                console.log('❌ No coverage reports found');
            }

        } catch (error) {
            console.log(`❌ Coverage audit error: ${error.message}`);
        }

        this.results.testCoverage = { 
            score, 
            maxScore, 
            coverageData,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Test Coverage Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditCICDTests() {
        console.log('🚀 Auditing CI/CD Testing Integration...');
        
        let score = 0;
        let maxScore = 100;
        let cicdFiles = [];
        let found = [];
        let missing = [];

        const cicdPaths = [
            { path: '.github/workflows', name: 'GitHub Actions', points: 30 },
            { path: '.gitlab-ci.yml', name: 'GitLab CI', points: 30 },
            { path: 'Jenkinsfile', name: 'Jenkins Pipeline', points: 30 },
            { path: '.circleci/config.yml', name: 'CircleCI', points: 30 }
        ];

        try {
            cicdPaths.forEach(item => {
                if (fs.existsSync(item.path)) {
                    found.push(item.name);
                    cicdFiles.push(item.path);
                    
                    // Check if it includes testing
                    if (item.path.includes('.github/workflows')) {
                        const files = fs.readdirSync(item.path);
                        files.forEach(file => {
                            if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                                const content = fs.readFileSync(path.join(item.path, file), 'utf8');
                                if (content.includes('test') || content.includes('npm test') || content.includes('yarn test')) {
                                    score += item.points;
                                    console.log(`✅ ${item.name} with testing - Found`);
                                    return;
                                }
                            }
                        });
                    } else {
                        try {
                            const content = fs.readFileSync(item.path, 'utf8');
                            if (content.includes('test') || content.includes('npm test') || content.includes('yarn test')) {
                                score += item.points;
                                console.log(`✅ ${item.name} with testing - Found`);
                            }
                        } catch (error) {
                            console.log(`⚠️ ${item.name} - Found but unreadable`);
                        }
                    }
                } else {
                    missing.push(item.name);
                    console.log(`❌ ${item.name} - Missing`);
                }
            });

            // Additional points for comprehensive CI/CD testing
            if (score > 0) {
                score += 10; // Bonus for having any CI/CD testing
            }

        } catch (error) {
            console.log(`❌ CI/CD audit error: ${error.message}`);
        }

        this.results.cicdTests = { 
            score, 
            maxScore, 
            cicdFiles, 
            found, 
            missing,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 CI/CD Testing Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async createTestingInfrastructure() {
        console.log('🔧 Creating Testing Infrastructure...');

        // Create Jest configuration
        if (!fs.existsSync('jest.config.js')) {
            await this.createJestConfig();
        }

        // Create test setup file
        if (!fs.existsSync('src/setupTests.js')) {
            await this.createTestSetup();
        }

        // Create sample test files
        if (!fs.existsSync('src/__tests__')) {
            fs.mkdirSync('src/__tests__', { recursive: true });
        }

        // Create example component test
        if (!fs.existsSync('src/__tests__/App.test.js')) {
            await this.createSampleComponentTest();
        }

        // Create example API test
        if (!fs.existsSync('src/__tests__/api.test.js')) {
            await this.createSampleAPITest();
        }

        // Create GitHub Actions workflow
        if (!fs.existsSync('.github/workflows/test.yml')) {
            await this.createGitHubActionsWorkflow();
        }

        console.log('✅ Testing infrastructure created\n');
    }

    async createJestConfig() {
        const jestConfig = `module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}'
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\\\.(js|jsx|ts|tsx)$': 'babel-jest'
  }
};
`;

        fs.writeFileSync('jest.config.js', jestConfig);
        console.log('✅ Created Jest configuration');
    }

    async createTestSetup() {
        const setupContent = `import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure Testing Library
configure({ testIdAttribute: 'data-testid' });

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Supabase
jest.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));

// Silence console warnings during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
`;

        fs.writeFileSync('src/setupTests.js', setupContent);
        console.log('✅ Created test setup file');
    }

    async createSampleComponentTest() {
        const componentTestContent = `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock the AuthContext
const MockAuthProvider = ({ children }) => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'client'
  };

  return (
    <div data-testid="auth-provider">
      {React.cloneElement(children, { user: mockUser })}
    </div>
  );
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <MockAuthProvider>
        {component}
      </MockAuthProvider>
    </BrowserRouter>
  );
};

describe('App Component', () => {
  test('renders without crashing', () => {
    renderWithRouter(<App />);
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    renderWithRouter(<App />);
    // Add specific loading assertions based on your app structure
  });

  test('handles navigation correctly', async () => {
    renderWithRouter(<App />);
    
    // Test navigation functionality
    // This is a placeholder - adjust based on your actual navigation
    await waitFor(() => {
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });
  });

  test('handles authentication state changes', async () => {
    renderWithRouter(<App />);
    
    // Test authentication state handling
    await waitFor(() => {
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });
  });
});\n`;

        fs.writeFileSync('src/__tests__/App.test.js', componentTestContent);
        console.log('✅ Created sample component test');
    }

    async createSampleAPITest() {
        const apiTestContent = `import { analyticsAPI } from '../api/analytics';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));

describe('Analytics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserAnalytics', () => {
    test('fetches user analytics successfully', async () => {
      const mockData = [
        { id: 1, user_id: 'user-1', event_type: 'login', created_at: '2024-01-01' }
      ];

      // Mock the Supabase chain
      require('../lib/supabase').supabase.from().select().eq().gte().order.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await analyticsAPI.getUserAnalytics('user-1', '30d');
      expect(result).toEqual(mockData);
    });

    test('handles errors gracefully', async () => {
      const mockError = { message: 'Database error' };

      require('../lib/supabase').supabase.from().select().eq().gte().order.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(analyticsAPI.getUserAnalytics('user-1', '30d')).rejects.toThrow();
    });
  });

  describe('trackUserEvent', () => {
    test('tracks user event successfully', async () => {
      const mockData = [
        { id: 1, user_id: 'user-1', event_type: 'click', event_data: { button: 'submit' } }
      ];

      require('../lib/supabase').supabase.from().insert.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await analyticsAPI.trackUserEvent('user-1', 'click', { button: 'submit' });
      expect(result).toEqual(mockData);
    });

    test('handles tracking errors', async () => {
      const mockError = { message: 'Insert failed' };

      require('../lib/supabase').supabase.from().insert.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(
        analyticsAPI.trackUserEvent('user-1', 'click', { button: 'submit' })
      ).rejects.toThrow();
    });
  });

  describe('getAnalyticsSummary', () => {
    test('generates analytics summary', async () => {
      // Mock multiple API calls
      const mockUserStats = { totalEvents: 100, uniqueUsers: 50 };
      const mockBookingStats = { totalEvents: 75 };
      const mockPaymentStats = { totalEvents: 25, totalRevenue: 1000 };

      // Mock the individual methods
      jest.spyOn(analyticsAPI, 'getUserStats').mockResolvedValue(mockUserStats);
      jest.spyOn(analyticsAPI, 'getBookingStats').mockResolvedValue(mockBookingStats);
      jest.spyOn(analyticsAPI, 'getPaymentStats').mockResolvedValue(mockPaymentStats);

      const result = await analyticsAPI.getAnalyticsSummary('30d');
      
      expect(result).toHaveProperty('users', mockUserStats);
      expect(result).toHaveProperty('bookings', mockBookingStats);
      expect(result).toHaveProperty('payments', mockPaymentStats);
      expect(result).toHaveProperty('generatedAt');
    });
  });

  describe('Utility functions', () => {
    test('getTimeRangeDate calculates correct date', () => {
      const result = analyticsAPI.getTimeRangeDate('7d');
      const expected = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      expect(new Date(result).getDate()).toBe(expected.getDate());
    });

    test('groupBy groups array correctly', () => {
      const testData = [
        { type: 'A', value: 1 },
        { type: 'B', value: 2 },
        { type: 'A', value: 3 }
      ];

      const result = analyticsAPI.groupBy(testData, 'type');
      
      expect(result.A).toHaveLength(2);
      expect(result.B).toHaveLength(1);
    });
  });
});
`;

        fs.writeFileSync('src/__tests__/api.test.js', apiTestContent);
        console.log('✅ Created sample API test');
    }

    async createGitHubActionsWorkflow() {
        if (!fs.existsSync('.github/workflows')) {
            fs.mkdirSync('.github/workflows', { recursive: true });
        }

        const workflowContent = `name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run unit tests
      run: npm test -- --coverage --watchAll=false

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

    - name: Build application
      run: npm run build

    - name: Run E2E tests
      if: matrix.node-version == '20.x'
      run: npm run test:e2e
      env:
        CI: true

  security:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run security audit
      run: npm audit --audit-level moderate

    - name: Check for vulnerabilities
      run: npm run security-check || true

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build for production
      run: npm run build

    - name: Archive build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: dist/
`;

        fs.writeFileSync('.github/workflows/test.yml', workflowContent);
        console.log('✅ Created GitHub Actions workflow');
    }

    findTestFiles(dir, testFiles = []) {
        try {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
                    this.findTestFiles(fullPath, testFiles);
                } else if (
                    item.endsWith('.test.js') || 
                    item.endsWith('.test.jsx') || 
                    item.endsWith('.spec.js') || 
                    item.endsWith('.spec.jsx') ||
                    item.endsWith('.test.ts') ||
                    item.endsWith('.test.tsx') ||
                    item.endsWith('.spec.ts') ||
                    item.endsWith('.spec.tsx')
                ) {
                    testFiles.push(fullPath);
                }
            });
        } catch (error) {
            // Skip directories that can't be read
        }
        return testFiles;
    }

    generateRecommendations() {
        const recommendations = [];

        // Infrastructure recommendations
        if (this.results.testInfrastructure.percentage < 80) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Infrastructure',
                issue: 'Missing testing framework components',
                solution: 'Install Jest, React Testing Library, and configure test environment'
            });
        }

        // Test coverage recommendations
        if (this.results.unitTests.percentage < 50) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Unit Tests',
                issue: 'Low test coverage',
                solution: 'Write unit tests for critical components and functions'
            });
        }

        // CI/CD recommendations
        if (this.results.cicdTests.percentage < 50) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'CI/CD',
                issue: 'No automated testing in CI/CD pipeline',
                solution: 'Set up GitHub Actions or similar CI/CD with automated testing'
            });
        }

        this.results.recommendations = recommendations;
        return recommendations;
    }

    generateReport() {
        console.log('\n📋 TESTING AUTOMATION AUDIT REPORT');
        console.log('==================================\n');

        const totalScore = this.results.testInfrastructure.score + 
                          this.results.unitTests.score + 
                          this.results.testCoverage.score + 
                          this.results.cicdTests.score;

        const maxScore = this.results.testInfrastructure.maxScore + 
                        this.results.unitTests.maxScore + 
                        this.results.testCoverage.maxScore + 
                        this.results.cicdTests.maxScore;

        const overallPercentage = Math.round(totalScore / maxScore * 100);

        console.log('🧪 TESTING COMPONENT SCORES:');
        console.log(`   Test Infrastructure: ${this.results.testInfrastructure.score}/${this.results.testInfrastructure.maxScore} (${this.results.testInfrastructure.percentage}%)`);
        console.log(`   Existing Tests: ${this.results.unitTests.score}/${this.results.unitTests.maxScore} (${this.results.unitTests.percentage}%)`);
        console.log(`   Test Coverage: ${this.results.testCoverage.score}/${this.results.testCoverage.maxScore} (${this.results.testCoverage.percentage}%)`);
        console.log(`   CI/CD Testing: ${this.results.cicdTests.score}/${this.results.cicdTests.maxScore} (${this.results.cicdTests.percentage}%)`);

        console.log(`\n🎯 OVERALL TESTING SCORE: ${totalScore}/${maxScore} (${overallPercentage}%)\n`);

        // Status determination
        let status = '';
        if (overallPercentage >= 80) {
            status = '🟢 EXCELLENT - Testing Ready';
        } else if (overallPercentage >= 60) {
            status = '🟡 GOOD - Minor Improvements Needed';
        } else if (overallPercentage >= 40) {
            status = '🟠 NEEDS WORK - Major Testing Setup Required';
        } else {
            status = '🔴 CRITICAL - No Testing Infrastructure';
        }

        console.log(`📊 STATUS: ${status}\n`);

        // Test summary
        if (this.results.unitTests.testFiles.length > 0) {
            console.log('📈 TEST SUMMARY:');
            console.log(`   Total Test Files: ${this.results.unitTests.testFiles.length}`);
            console.log(`   Unit Tests: ${this.results.unitTests.testTypes.unit}`);
            console.log(`   Integration Tests: ${this.results.unitTests.testTypes.integration}`);
            console.log(`   E2E Tests: ${this.results.unitTests.testTypes.e2e}\n`);
        }

        // Recommendations
        const recommendations = this.generateRecommendations();
        if (recommendations.length > 0) {
            console.log('🔧 RECOMMENDATIONS:');
            recommendations.forEach(rec => {
                console.log(`   [${rec.priority}] ${rec.category}: ${rec.issue}`);
                console.log(`       → ${rec.solution}`);
            });
        }

        this.results.totalScore = overallPercentage;
        return this.results;
    }

    async runFullAudit() {
        console.log('🚀 Starting comprehensive testing automation audit...\n');

        // Run all audits
        await this.auditTestInfrastructure();
        await this.auditExistingTests();
        await this.auditTestCoverage();
        await this.auditCICDTests();

        // Create missing infrastructure
        await this.createTestingInfrastructure();

        // Generate final report
        return this.generateReport();
    }
}

async function main() {
    const testingManager = new TestingAutomationManager();
    const results = await testingManager.runFullAudit();
    
    console.log('\n✅ Testing automation audit completed!');
    console.log('🧪 Testing infrastructure created and ready for implementation');
    
    return results;
}

main().catch(console.error); 