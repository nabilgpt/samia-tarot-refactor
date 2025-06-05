# SAMIA TAROT - Full-Stack Spiritual Guidance Platform 🔮

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-%5E18.2.0-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/supabase-backend-green.svg)](https://supabase.com/)

A comprehensive **full-stack spiritual guidance platform** featuring tarot readings, AI-powered insights, real-time communication, and advanced call & video systems with emergency capabilities.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/SAMIAFULLAPP.git
cd SAMIAFULLAPP

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#️-technology-stack)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Configuration](#-environment-configuration)
- [Database Setup](#-database-setup)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 Core Platform Features
- **Multi-Role Authentication** - Client, Reader, Admin, Monitor, Super Admin roles
- **Real-time Chat System** - WebSocket-based messaging with file sharing
- **Booking & Payment System** - Integrated payment processing with multiple methods
- **User Profile Management** - Comprehensive profile system with avatars and preferences

### 🔮 Tarot & AI Reading System
- **AI-Powered Tarot Readings** - Advanced AI interpretation engine
- **Interactive Card Selection** - Beautiful card selection interface
- **Multiple Spread Layouts** - Celtic Cross, Three Card, custom spreads
- **Reading History & Analytics** - Track and analyze reading patterns
- **Custom Spread Creation** - Create personalized tarot spreads

### 📞 Advanced Call & Video System
- **WebRTC Voice/Video Calls** - High-quality real-time communication
- **Emergency Call System** - Instant emergency calls with siren alerts
- **Call Duration Control** - Automatic time enforcement with countdown
- **Recording System** - Automatic call recording with admin access
- **Admin Oversight** - Stealth monitoring and call management
- **Quality Monitoring** - Real-time connection quality analysis

### 📊 Analytics & Business Intelligence
- **Comprehensive Dashboard** - Multi-role dashboard system
- **Revenue Tracking** - Detailed financial reporting and analytics
- **User Engagement Metrics** - Track user behavior and platform usage
- **AI-Powered Insights** - Business intelligence and recommendations

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern React with hooks and context
- **Tailwind CSS** - Utility-first CSS framework with custom cosmic theme
- **Vite** - Fast build tool and development server
- **Framer Motion** - Smooth animations and transitions
- **Lucide React** - Beautiful icon library
- **React Router** - Client-side routing
- **i18next** - Internationalization (Arabic/English support)

### **Backend & Database**
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **PostgreSQL** - Relational database with advanced features
- **Row Level Security (RLS)** - Database-level security policies
- **Supabase Auth** - Authentication with multiple providers
- **Supabase Storage** - File storage and management
- **Real-time Subscriptions** - Live data updates

### **Communication & Calls**
- **WebRTC** - Peer-to-peer real-time communication
- **PeerJS** - Simplified WebRTC implementation
- **WebSocket** - Real-time messaging
- **MediaRecorder API** - Call recording functionality
- **Web Audio API** - Emergency siren generation

### **Development Tools**
- **ESLint** - Code linting and formatting
- **Vitest** - Testing framework
- **PostCSS** - CSS processing
- **PWA Support** - Progressive Web App capabilities

## 📁 Project Structure

```
SAMIAFULLAPP/
├── frontend/                        # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/              # Admin dashboard components
│   │   │   ├── AI/                 # AI and tarot reading components
│   │   │   ├── Analytics/          # Analytics and reporting
│   │   │   ├── Booking/            # Booking system components
│   │   │   ├── Business/           # Business logic components
│   │   │   ├── Call/               # Call & video system
│   │   │   │   ├── CallRoom.jsx    # Main WebRTC call interface
│   │   │   │   ├── CallTimer.jsx   # Duration countdown timer
│   │   │   │   ├── EmergencyButton.jsx # Emergency call trigger
│   │   │   │   └── ...
│   │   │   ├── Chat/               # Real-time chat system
│   │   │   ├── Client/             # Client-specific components
│   │   │   ├── Layout/             # Layout and navigation
│   │   │   ├── Payment/            # Payment processing
│   │   │   ├── Reader/             # Reader dashboard components
│   │   │   ├── Tarot/              # Tarot card and reading components
│   │   │   └── UI/                 # Reusable UI components
│   │   ├── pages/                  # Page components
│   │   │   ├── dashboard/          # Dashboard pages by role
│   │   │   │   ├── SuperAdminDashboard.jsx
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── ReaderDashboard.jsx
│   │   │   │   └── ClientDashboard.jsx
│   │   │   └── ...
│   │   ├── api/                    # API integration layer
│   │   │   ├── adminApi.js         # Admin API functions
│   │   │   ├── callApi.js          # Call system API
│   │   │   ├── chatApi.js          # Chat API
│   │   │   ├── superAdminApi.js    # Super Admin API
│   │   │   ├── tarotApi.js         # Tarot reading API
│   │   │   └── ...
│   │   ├── context/                # React context providers
│   │   │   ├── AuthContext.jsx     # Authentication context
│   │   │   ├── UIContext.jsx       # UI state management
│   │   │   └── ConfigContext.jsx   # Configuration context
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # Utility libraries
│   │   │   ├── supabase.js         # Supabase client configuration
│   │   │   ├── apiSecurity.js      # API security layer
│   │   │   └── ...
│   │   ├── styles/                 # CSS and styling
│   │   ├── utils/                  # Utility functions
│   │   └── tests/                  # Test files
│   ├── public/                     # Static assets
│   ├── package.json
│   └── ...
├── backend/                         # Backend services (future expansion)
├── database/                        # Database schemas and migrations
│   ├── phase1-core-platform.sql    # Core platform schema
│   ├── phase2-tarot-ai.sql         # AI tarot system schema
│   ├── phase3-call-video-system.sql # Call system schema
│   ├── role-based-security.sql     # Security policies
│   └── ...
├── docs/                           # Project documentation
│   ├── API.md                      # API documentation
│   ├── DEPLOYMENT.md               # Deployment guide
│   ├── SECURITY.md                 # Security documentation
│   └── ...
├── scripts/                        # Utility scripts
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
├── README.md                       # This file
└── package.json                    # Project dependencies
```

## 🔧 Installation & Setup

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **Supabase** account and project
- **Git** for version control

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/SAMIAFULLAPP.git
cd SAMIAFULLAPP
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
```bash
# Copy the environment template
cp env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

### 4. Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database schemas in order:
   ```sql
   -- In your Supabase SQL editor:
   \i database/phase1-core-platform.sql
   \i database/phase2-tarot-ai.sql
   \i database/phase3-call-video-system.sql
   \i database/role-based-security.sql
   ```

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:5173` to see the application.

## 🔑 Environment Configuration

Create a `.env` file based on `env.example`:

```env
# Supabase Configuration
VITE_SUPABASE_URL="your_supabase_project_url"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
VITE_SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Authentication Providers
VITE_GOOGLE_CLIENT_ID="your_google_client_id"
VITE_APPLE_CLIENT_ID="your_apple_client_id"
VITE_FACEBOOK_APP_ID="your_facebook_app_id"

# Payment Configuration
VITE_STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key"
VITE_PAYPAL_CLIENT_ID="your_paypal_client_id"

# API Configuration
VITE_API_BASE_URL="your_api_base_url"
VITE_WEBSOCKET_URL="your_websocket_url"

# Feature Flags
VITE_ENABLE_AI_READINGS="true"
VITE_ENABLE_VIDEO_CALLS="true"
VITE_ENABLE_EMERGENCY_CALLS="true"
```

## 🗄️ Database Setup

### Core Tables
- **profiles** - User profile information
- **services** - Available tarot services
- **bookings** - Booking and appointment system
- **payments** - Payment transaction records
- **messages** - Chat and messaging system
- **reviews** - User reviews and ratings

### Advanced Features
- **call_sessions** - Call and video session tracking
- **tarot_readings** - AI tarot reading records
- **emergency_calls** - Emergency call logs
- **audit_logs** - System audit and security logs

### Security
- **Row Level Security (RLS)** policies for all tables
- **Role-based access control** with multiple user roles
- **API security layer** with permission validation

## 🚀 Development

### Available Scripts
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run coverage     # Generate test coverage

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors

# Type Checking
npm run type-check   # Run TypeScript type checking
```

### Development Workflow
1. **Feature Development** - Create feature branches for new functionality
2. **Code Quality** - Use ESLint and Prettier for consistent code formatting
3. **Testing** - Write tests for new components and functionality
4. **Documentation** - Update documentation for new features

## 🌐 Deployment

### Production Build
```bash
npm run build
```

### Deployment Platforms
- **Vercel** - Recommended for React applications
- **Netlify** - Alternative deployment platform
- **Supabase** - Backend is already hosted

### Environment Variables
Ensure all production environment variables are configured:
- Supabase production URLs and keys
- Payment provider production keys
- Authentication provider production settings

## 📚 API Documentation

### Authentication API
- **POST** `/auth/login` - User login
- **POST** `/auth/signup` - User registration
- **POST** `/auth/logout` - User logout
- **GET** `/auth/profile` - Get user profile

### Booking API
- **GET** `/api/services` - List available services
- **POST** `/api/bookings` - Create new booking
- **GET** `/api/bookings/:id` - Get booking details
- **PUT** `/api/bookings/:id` - Update booking

### Call API
- **POST** `/api/calls/create` - Create call session
- **POST** `/api/calls/emergency` - Trigger emergency call
- **GET** `/api/calls/:id/recording` - Get call recording

For complete API documentation, see [docs/API.md](docs/API.md).

## 🔐 Security

### Authentication
- **Multi-provider authentication** (Google, Apple, Facebook, etc.)
- **Role-based access control** (Client, Reader, Admin, Monitor, Super Admin)
- **Session management** with secure tokens

### Data Protection
- **Row Level Security (RLS)** on all database tables
- **API security layer** with permission validation
- **Encrypted data storage** for sensitive information
- **GDPR compliance** with data retention policies

### Call Security
- **WebRTC encryption** for all voice/video calls
- **Recording access control** limited to authorized roles
- **Emergency call routing** with audit logging

For detailed security information, see [docs/SECURITY.md](docs/SECURITY.md).

## 🎨 Theme System

The application features a **cosmic/dark neon theme** with:
- **Purple/pink gradient** color schemes
- **Glass morphism** effects with backdrop blur
- **Particle animations** and cosmic background effects
- **Responsive design** for all screen sizes
- **Multi-language support** (Arabic/English with RTL)

## 🌍 Internationalization

- **Arabic/English** support with automatic RTL layout
- **Dynamic language switching** in user interface
- **Localized content** for all user-facing text
- **Cultural adaptation** for different regions

## 📱 Progressive Web App (PWA)

- **Offline support** for core functionality
- **Push notifications** for important updates
- **App-like experience** on mobile devices
- **Automatic updates** for new versions

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style and conventions
- Write tests for new functionality
- Update documentation for new features
- Preserve the cosmic theme and design system

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- **GitHub Issues** - Report bugs and request features
- **Documentation** - Check the [docs/](docs/) directory
- **Community** - Join our community discussions

---

**Built with ❤️ using React, Supabase, and modern web technologies**

*Spiritual guidance powered by technology* 🔮✨ 