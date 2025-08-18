# SAMIA TAROT - VIP & REGULAR SERVICES BOOKING POLICY

##  System Overview

Complete implementation of VIP & Regular Services booking system with strict business rules enforcement.

##  Business Rules

### VIP Services
- Can be booked for today, tomorrow, or future dates
- Requires minimum 2 hours advance notice
- Priority booking access
- 24h cancellation policy

### Regular Services  
- Can ONLY be booked starting day after tomorrow
- Cannot book for today or tomorrow
- 48h minimum advance notice
- 48h cancellation policy

##  Database Schema

### Tables: readers, services, bookings
### Functions: validate_booking_rules()
### Views: services_with_readers, bookings_with_details

##  API Endpoints

- /api/services (CRUD)
- /api/bookings (CRUD with validation)  
- /api/readers (CRUD)

##  Frontend Components

- ServicesManagement.jsx (Admin)
- ServiceBooking.jsx (Client)

##  Implementation Status

- [x] Database schema complete
- [x] API endpoints working
- [x] Frontend components ready
- [x] Business rules enforced
- [x] No mock data anywhere
- [x] VIP/Regular validation working

##  Usage

1. npm run backend
2. npm run dev  
3. Test: node scripts/test-vip-regular-system.js

**Status**:  Production Ready
