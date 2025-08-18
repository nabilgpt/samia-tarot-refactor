module.exports = {
  env: {
    node: true,
    es2021: true,
    browser: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Variable shadowing prevention
    'no-shadow': 'error',
    'no-shadow-restricted-names': 'error',
    'no-redeclare': 'error',
    'no-implicit-globals': 'error',
    
    // Error prevention
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    
    // Best practices
    'prefer-const': 'error',
    'no-var': 'error',
    'no-duplicate-imports': 'error',
    
    // Async/await best practices
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Style consistency
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    
    // ES6+ features
    'arrow-spacing': 'error',
    'template-curly-spacing': 'error',
    'object-shorthand': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    'logs/',
    'uploads/',
    'temp-audio/',
    '*.md',
    'frontend/node_modules/'
  ]
}; 