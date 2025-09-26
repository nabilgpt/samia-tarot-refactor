# 🔮 SAMIA TAROT - Frontend Handover Documentation

## Routes Map
- `/` - Home page with cosmic theme, services preview, daily horoscopes
- `/horoscopes` - Daily horoscopes grid (12 zodiac placeholders when empty)
- `/services` - Services catalog with order creation
- `/orders/:orderId` - Order tracking with polling and signed URL invoices
- `/login` - Authentication form

## Components Map (Lean Architecture)
```
src/
├── components/
│   ├── AppLayout.jsx          # Single cosmic background + navigation wrapper
│   ├── Navigation.jsx         # Responsive nav with mobile hamburger menu
│   └── ErrorBoundary.jsx      # Global error handling
├── pages/
│   ├── Home.jsx              # Landing page with theme consistency
│   ├── Horoscopes.jsx        # 12 zodiac grid with empty state handling
│   ├── Services.jsx          # 3-column cards with inline error display
│   ├── Order.jsx             # Polling with exponential backoff
│   └── Login.jsx             # Auth form with validation
├── lib/
│   └── api.ts                # Lightweight fetch wrapper
├── App.jsx                   # Router with nested layout
└── index.css                 # Theme CSS variables + cosmic styles
```

## API Contracts
```typescript
// GET /api/horoscopes/daily
{ horoscopes: Horoscope[], date: string, count: number }

// POST /api/orders
Request: { service_id: string, service_name: string, amount: number, metadata?: object }
Response: { order_id: string, status: "created", message: string }

// GET /api/orders/:id
{ order_id: string, status: "pending"|"processing"|"completed"|"failed", ... }

// GET /api/payments/invoice/:order_id
{ signed_url: string } // ≤15 minute TTL, no client caching

// GET /api/services
{ services: Service[], count: number }
```

## Theme Rules (NON-NEGOTIABLE)
1. **Single Background Policy**: Cosmic particles/orbs mounted ONCE in AppLayout
2. **CSS Variables Only**: Use `var(--*)` tokens, NO hard-coded colors
3. **Unified Typography**: All pages share same spacing/font scale
4. **Reduced Motion**: `useReducedMotion()` in all animated components
5. **Theme Source**: Exact copy from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`

## Frontend Runbook

### Development
```bash
npm run frontend    # Start Vite dev server (http://localhost:5173)
npm run backend     # Start API server (http://localhost:8001)
npm run dev         # Both frontend + backend
```

### Accessibility Features
- ✅ `:focus-visible` styles for keyboard navigation
- ✅ `prefers-reduced-motion` respected everywhere
- ✅ Particles pause on blur/outside viewport (`fpsLimit: 45`)
- ✅ Screen reader friendly with proper ARIA labels

### Performance Optimizations
- tsParticles: `fpsLimit: 45, pauseOnBlur: true, pauseOnOutsideViewport: true`
- Order polling: Exponential backoff (3s → 30s max)
- Loading skeletons on all API-dependent pages
- Responsive images with proper dimensions

### Error Handling Strategy
- **Services**: Inline error display (no alerts)
- **Orders**: Polling continues with backoff on failures
- **API**: Graceful degradation to empty states
- **Global**: ErrorBoundary with cosmic-themed fallback

### Mobile Responsiveness
- Navigation: Hamburger menu on mobile
- Grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Services: Equal height cards with consistent spacing
- Touch-friendly buttons (min 44px targets)

### Troubleshooting
- **404 on /api/orders**: Check backend running on :8001
- **Particles not rendering**: Verify tsparticles-slim import
- **Theme inconsistency**: Ensure using CSS variables only
- **Reduced motion not working**: Check framer-motion useReducedMotion hook

### Build & Deploy
```bash
npm run build       # Production build
npm run preview     # Preview production build
npm run lint        # ESLint check
```

## Sign-off Criteria ✅
- [x] Zero console warnings during navigation
- [x] All smoke checks return 2xx responses
- [x] No hard-coded colors/shadows (CSS variables only)
- [x] Repository remains lean (no unnecessary files)
- [x] Theme consistency across all pages
- [x] Accessibility standards met
- [x] Performance optimizations active
- [x] Responsive design working on all breakpoints

---
**Frontend Status**: 🚀 **READY FOR PRODUCTION**
**Last Updated**: 2025-09-26
**UAT Completed**: ✅ All tests passing