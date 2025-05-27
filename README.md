# SAMIA TAROT - سامية تاروت

A modern, responsive web application for fortune-telling and tarot reading services with Arabic-first design and RTL support.

## 🌟 Features

- **🌙 Dark Cosmic Theme**: Beautiful dark theme with golden highlights and cosmic animations
- **🌍 Multilingual Support**: Arabic (default) and English with RTL/LTR support
- **📱 Mobile-First Design**: Fully responsive design optimized for all devices
- **🔐 Authentication System**: Complete login/signup flow with form validation
- **🎨 Modern UI Components**: Reusable components with Tailwind CSS
- **⚡ Fast Performance**: Built with Vite for optimal development and build performance
- **🎭 Smooth Animations**: CSS animations and transitions for enhanced UX

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom cosmic theme
- **Routing**: React Router DOM
- **Internationalization**: React i18next
- **Icons**: Lucide React
- **State Management**: React Context + useReducer
- **Form Handling**: Native React with validation

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd samia-tarot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.jsx
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   └── Layout.jsx
├── pages/              # Page components
│   ├── Home.jsx
│   ├── Login.jsx
│   └── Signup.jsx
├── context/            # React Context providers
│   ├── AuthContext.jsx
│   └── UIContext.jsx
├── utils/              # Utility functions and data
│   ├── cn.js
│   └── mockData.js
├── i18n/               # Internationalization
│   ├── ar.json
│   ├── en.json
│   └── index.js
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## 🎨 Design System

### Colors

- **Cosmic**: Purple/violet tones for primary elements
- **Gold**: Golden yellow for accents and highlights
- **Dark**: Various shades of dark blue/gray for backgrounds

### Typography

- **Arabic**: Noto Sans Arabic
- **English**: Inter

### Components

All components follow a consistent design pattern with:
- Cosmic dark backgrounds
- Golden accent colors
- Smooth hover transitions
- RTL/LTR support
- Mobile-responsive design

## 🌐 Internationalization

The app supports Arabic (default) and English with:
- Complete RTL/LTR layout switching
- Translated UI text
- Localized date/number formatting
- Dynamic language switching

## 🔐 Authentication

Mock authentication system with:
- Login/Signup forms
- Form validation
- Local storage persistence
- Protected routes (to be implemented)
- User context management

## 📱 Responsive Design

- **Mobile First**: Designed for mobile devices first
- **Breakpoints**: sm, md, lg, xl following Tailwind CSS standards
- **Flexible Layouts**: Grid and flexbox layouts that adapt to screen size
- **Touch Friendly**: Appropriate touch targets and spacing

## 🎭 Animations

- **Cosmic Effects**: Floating orbs and cosmic patterns
- **Hover States**: Smooth transitions on interactive elements
- **Loading States**: Animated spinners and skeleton screens
- **Page Transitions**: Smooth navigation between pages

## 🚧 Roadmap

### Phase 1 (Current)
- [x] Project setup and basic structure
- [x] Authentication pages (Login/Signup)
- [x] Home page with hero section
- [x] Responsive navigation
- [x] Internationalization setup

### Phase 2 (Next)
- [ ] Services listing and details pages
- [ ] Reader profiles and listings
- [ ] Booking system
- [ ] User dashboard
- [ ] Wallet and payment integration

### Phase 3 (Future)
- [ ] Real-time chat system
- [ ] Video call integration
- [ ] Admin dashboard
- [ ] Reader dashboard
- [ ] Monitor dashboard
- [ ] Backend API integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspiration from modern fortune-telling platforms
- Tailwind CSS for the utility-first CSS framework
- Lucide React for beautiful icons
- React ecosystem for powerful development tools

---

**Built with ❤️ for the mystical arts community** 