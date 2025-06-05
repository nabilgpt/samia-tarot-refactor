# Working Hours Approval System - SAMIA TAROT

## Overview

The Working Hours Approval System enables readers to propose schedule changes up to 1 year in advance, with all changes requiring admin approval before becoming live. The system maintains the cosmic design theme and supports multilingual functionality.

## System Architecture

### Database Layer
- **Tables**: `reader_schedule`, `working_hours_requests`, `working_hours_audit`, `booking_window_settings`
- **Views**: `my_working_hours_requests`, `pending_working_hours_requests`, `my_schedule`
- **Functions**: `submit_working_hours_request()`, `review_working_hours_request()`, `apply_working_hours_changes()`, `cancel_working_hours_request()`
- **Row Level Security**: Comprehensive RLS policies for role-based access control

### API Layer
- **File**: `src/api/workingHoursApi.js`
- **Features**: Reader schedule management, request submission, admin approval workflow, real-time subscriptions
- **Validation**: Client-side and server-side validation for schedule conflicts and business rules

### Frontend Components

#### Reader Dashboard Integration
- **File**: `src/components/reader/WorkingHoursManager.jsx`
- **Features**: 
  - Two-tab interface (My Schedule / Approval Requests)
  - Add/edit/delete time slots with validation
  - Bulk add functionality for recurring schedules
  - Request status tracking with visual indicators
  - Modal forms with cosmic styling

#### Admin Dashboard Integration  
- **File**: `src/components/admin/WorkingHoursApprovalQueue.jsx`
- **Features**:
  - Admin review interface with request details
  - Statistics dashboard
  - Search and filtering capabilities
  - Approve/reject with mandatory reasons
  - Comprehensive audit information

## Business Rules

### Reader Planning Window
- Readers can plan working hours up to **1 year** in advance
- All schedule changes require admin approval
- No schedule conflicts allowed (overlapping time slots)
- Minimum slot duration: 30 minutes
- Maximum bookings per slot: 1-10 (configurable)

### Client Booking Window
- Clients can book appointments up to **31 days** in advance
- VIP clients can book up to **90 days** in advance
- Emergency bookings: immediate (0 hours notice)
- Minimum notice for regular bookings: 2 hours

### Approval Workflow
1. Reader submits working hours request
2. Request enters pending state
3. Admin reviews and approves/rejects
4. If approved, changes are automatically applied
5. Complete audit trail maintained

## Key Features

### Request Types
- **Add**: New time slot creation
- **Edit**: Modify existing time slot  
- **Delete**: Remove time slot (soft delete)
- **Bulk Add**: Multiple slots with recurring patterns

### Status Tracking
- **Pending**: Awaiting admin review
- **Approved**: Approved and applied
- **Rejected**: Rejected with reason
- **Cancelled**: Cancelled by reader

### Validation & Security
- Time range validation (no past dates, max 1 year ahead)
- Schedule conflict detection
- Role-based access control
- Input sanitization and validation
- Rate limiting and abuse prevention

## Installation & Setup

### 1. Database Schema
```sql
-- Run this in your Supabase SQL editor
\i database/working_hours_approval_system.sql
```

### 2. Environment Variables
```env
# Already configured in your existing .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Component Integration
The components are already integrated into the existing dashboards:
- Reader Dashboard: "Working Hours" tab
- Admin Dashboard: "Working Hours" in Approval Queue

## Usage Guide

### For Readers

#### Adding Working Hours
1. Navigate to Reader Dashboard > Working Hours tab
2. Click "Add Slot" button
3. Fill in date, time range, and preferences
4. Submit for admin approval
5. Track request status in "Approval Requests" tab

#### Bulk Adding
1. Click "Bulk Add" button
2. Set date range and days of week
3. Configure time slots and preferences
4. Submit bulk request

#### Managing Requests
- View all requests in "Approval Requests" tab
- Cancel pending requests if needed
- See approval/rejection reasons
- Track request history

### For Admins

#### Reviewing Requests
1. Navigate to Admin Dashboard > Approval Queue > Working Hours
2. Review pending requests with full details
3. Approve or reject with mandatory reasons
4. View request statistics and analytics

#### Monitoring System
- Real-time updates on new requests
- Search and filter capabilities
- Audit trail viewing
- System analytics and reporting

## API Reference

### Reader Functions
```javascript
// Get reader's schedule
await WorkingHoursAPI.getMySchedule(filters);

// Submit new request
await WorkingHoursAPI.submitRequest(requestData);

// Get reader's requests
await WorkingHoursAPI.getMyRequests(filters);

// Cancel pending request
await WorkingHoursAPI.cancelRequest(requestId);
```

### Admin Functions
```javascript
// Get pending requests
await WorkingHoursAPI.getPendingRequests(filters);

// Review request
await WorkingHoursAPI.reviewRequest(requestId, action, reason);

// Get all requests with pagination
await WorkingHoursAPI.getAllRequests(page, limit, filters);
```

### Utility Functions
```javascript
// Validate working hours data
WorkingHoursAPI.validateWorkingHours(data);

// Format schedule data
WorkingHoursAPI.formatScheduleData(scheduleItem);

// Generate recurring slots
WorkingHoursAPI.generateRecurringSlots(baseSlot, pattern);
```

## Testing

### Running Tests
```bash
# Test the working hours system
node scripts/test-working-hours.js

# Run full linter
npm run lint

# Start development server
npm run dev
```

### Manual Testing Checklist
- [ ] Reader can add working hours
- [ ] Reader can edit existing hours  
- [ ] Reader can delete hours
- [ ] Reader can bulk add hours
- [ ] Admin can approve requests
- [ ] Admin can reject requests
- [ ] Audit trail is maintained
- [ ] RLS policies work correctly
- [ ] Real-time updates function
- [ ] Validation prevents conflicts

## Troubleshooting

### Common Issues

#### Database Schema Not Applied
- **Error**: Tables/functions don't exist
- **Solution**: Run `database/working_hours_approval_system.sql` in Supabase

#### RLS Policy Issues
- **Error**: "Row level security policy violation"
- **Solution**: Check user authentication and role assignments

#### Request Submission Fails
- **Error**: Validation errors or conflicts
- **Solution**: Check date ranges, time overlaps, and business rules

#### Real-time Updates Not Working
- **Error**: Stale data in components
- **Solution**: Verify Supabase realtime subscriptions are enabled

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('working-hours-debug', 'true');
```

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Efficient RLS policies
- Pagination for large datasets
- Connection pooling

### Frontend Optimization
- Lazy loading of components
- Efficient state management
- Debounced search inputs
- Optimistic updates

### Caching Strategy
- API response caching
- Browser local storage for preferences
- Supabase real-time subscriptions for live updates

## Security

### Data Protection
- All data encrypted in transit and at rest
- RLS policies prevent unauthorized access
- Input validation and sanitization
- Audit logging for all actions

### Access Control
- Role-based permissions (Reader/Admin)
- Session-based authentication
- API rate limiting
- Cross-origin resource sharing (CORS) configured

## Compliance

### Data Privacy
- GDPR compliant data handling
- User consent for data processing
- Right to deletion support
- Data export capabilities

### Audit Requirements
- Complete audit trail maintained
- Immutable log entries
- Timestamp and user tracking
- Regulatory compliance ready

## Future Enhancements

### Planned Features
- [ ] Recurring schedule templates
- [ ] Advanced notification system
- [ ] Mobile app integration
- [ ] Calendar synchronization
- [ ] Advanced analytics dashboard
- [ ] Multi-timezone support
- [ ] Automated approval rules
- [ ] Integration with external calendars

### Technical Improvements
- [ ] GraphQL API layer
- [ ] Advanced caching mechanisms
- [ ] Machine learning for pattern recognition
- [ ] Advanced reporting and analytics
- [ ] Mobile-first responsive design

## Support

For technical support or questions about the Working Hours Approval System:

1. Check this documentation first
2. Review the implementation files
3. Run the test script: `node scripts/test-working-hours.js`
4. Check the browser console for detailed error messages
5. Verify database schema and RLS policies

## Version History

- **v1.0.0** - Initial implementation with full approval workflow
- **v1.0.1** - Bug fixes and performance improvements
- **v1.1.0** - Enhanced UI/UX and additional validation
- **v1.2.0** - Bulk operations and recurring schedules
- **v1.3.0** - Advanced filtering and search capabilities

---

**System Status**: ✅ Production Ready
**Last Updated**: 2024-01-20
**Author**: SAMIA TAROT Development Team 