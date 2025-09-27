# M17 Orders Workflow Implementation

## Overview

Complete end-to-end orders workflow implementation with strict RLS parity and state machine validation. Handles the full lifecycle: create → assign → produce → approve/reject → deliver.

## State Machine

```
[new] ---(admin assign)---> [assigned] ---(reader output)---> [awaiting_approval]
                                ↑                                      |
                                |                                      v
                        [rejected] <--(monitor reject)-- (monitor approve)
                                ↑                                      |
                                |                                      v
                        (reader resubmit)                        [approved]
                                                                      |
                                                              (admin deliver)
                                                                      v
                                                                [delivered]
```

**Status Flow:**
1. `new` → `assigned` (admin assigns reader)
2. `assigned` → `awaiting_approval` (reader uploads output)
3. `awaiting_approval` → `approved` (monitor approves)
4. `awaiting_approval` → `rejected` (monitor rejects with reason)
5. `rejected` → `awaiting_approval` (reader resubmits output)
6. `approved` → `delivered` (admin/system delivers)

**Terminal States:** `delivered`, `cancelled`

## API Endpoints

### Order Management
- `POST /api/orders` - Create order (client)
- `GET /api/orders` - List orders (client: own, admin: filtered)
- `GET /api/orders/{id}` - Get order details (RLS enforced)

### Workflow Operations
- `POST /api/orders/{id}/assign` - Assign reader (admin only)
- `POST /api/orders/{id}/output` - Upload output media/text (assigned reader only)
- `POST /api/orders/{id}/approve` - Approve order (monitor/admin/superadmin)
- `POST /api/orders/{id}/reject` - Reject with reason (monitor/admin/superadmin)
- `POST /api/orders/{id}/deliver` - Deliver to client (admin/superadmin)

### Media Upload
- `POST /api/media/upload` - Create signed URL and register media asset

## Role-Based Access Control

### Client (role: 'client')
- ✅ Create orders (`POST /api/orders`)
- ✅ View own orders (`GET /api/orders`, `GET /api/orders/{id}` where user_id = self)
- ❌ Cannot assign readers, approve, reject, or deliver

### Reader (role: 'reader') 
- ✅ Upload output to assigned orders (`POST /api/orders/{id}/output`)
- ✅ View assigned orders (`GET /api/orders/{id}` where assigned_reader = self)
- ❌ Cannot create orders for others, assign readers, or approve/reject

### Monitor (role: 'monitor')
- ✅ Approve orders (`POST /api/orders/{id}/approve`)
- ✅ Reject orders (`POST /api/orders/{id}/reject`)  
- ✅ View all orders (`GET /api/orders`, `GET /api/orders/{id}`)
- ❌ Cannot deliver orders (admin-only)

### Admin/Superadmin (roles: 'admin', 'superadmin')
- ✅ Full access to all endpoints
- ✅ Assign readers (`POST /api/orders/{id}/assign`)
- ✅ Deliver orders (`POST /api/orders/{id}/deliver`)
- ✅ Override all workflow restrictions

## Request/Response Examples

### Create Order
```bash
POST /api/orders
Authorization: Bearer {jwt}
X-User-Id: {client_uuid}

{
  "service_code": "tarot",
  "question_text": "What does my future hold?",
  "is_gold": false,
  "input_media_id": 123
}

# Response: 201
{
  "success": true,
  "order_id": 456,
  "status": "new"
}
```

### Assign Reader
```bash
POST /api/orders/456/assign
Authorization: Bearer {jwt}
X-User-Id: {admin_uuid}

{
  "reader_id": "reader-uuid-here"
}

# Response: 200
{
  "success": true,
  "order_id": 456,
  "status": "assigned"
}
```

### Upload Output
```bash
POST /api/orders/456/output
Authorization: Bearer {jwt}
X-User-Id: {reader_uuid}

{
  "output_media_id": 789,
  "notes": "Reading complete with insights"
}

# Response: 200
{
  "success": true,
  "order_id": 456,
  "status": "awaiting_approval"
}
```

### Approve Order
```bash
POST /api/orders/456/approve
Authorization: Bearer {jwt}
X-User-Id: {monitor_uuid}

{
  "note": "High quality reading, approved for delivery"
}

# Response: 200
{
  "success": true,
  "order_id": 456,
  "status": "approved"
}
```

### Deliver Order
```bash
POST /api/orders/456/deliver
Authorization: Bearer {jwt}
X-User-Id: {admin_uuid}

# Response: 200
{
  "success": true,
  "order_id": 456,
  "status": "delivered"
}
```

## Business Rules

### Assignment Rules
- One active `assigned_reader` per order
- Reassignment allowed by admin (audited)
- Reader must have 'reader' role

### Output Rules  
- `output_media_id` is optional (text-only replies allowed)
- Prefer audio output when available
- Output can be resubmitted after rejection

### Approval Rules
- Only `awaiting_approval` orders can be approved/rejected
- Rejection requires reason (stored in `moderation_actions`)
- Client verification status must be maintained

### Delivery Rules
- Only `approved` orders can be delivered
- Delivery triggers notification hooks (M22 integration point)
- `delivered` is terminal state

### State Transition Rules
- Illegal transitions return `409 Conflict`
- State changes are atomic
- All transitions audited

## RLS Policy Compliance

Route guards exactly mirror database RLS policies:

### Profiles Access
- User: own profile only
- Admin/Superadmin: all profiles  
- Delete: superadmin only

### Orders Access
- Client: own orders only (`user_id = auth.uid()`)
- Reader: assigned orders (`assigned_reader = auth.uid()`)  
- Monitor/Admin/Superadmin: full access

### Media Assets Access
- Owner: own assets
- Reader: assets referenced by assigned orders
- Admin/Monitor: full access

## Error Handling

### Common Error Codes
- `400` - Invalid request data
- `403` - Access denied (RLS or role check failed)
- `404` - Order/resource not found
- `409` - Invalid state transition
- `412` - Precondition failed (incomplete profile)
- `429` - Rate limit exceeded
- `500` - Internal server error

### State Transition Errors
```json
{
  "detail": "Cannot upload output for status: delivered",
  "status_code": 409
}
```

### Access Control Errors  
```json
{
  "detail": "Access denied", 
  "status_code": 403
}
```

## Audit Trail

Every workflow operation writes to `audit_log`:

### Events Logged
- `order_create` - Order creation
- `order_assign` - Reader assignment  
- `order_result_upload` - Output submission
- `order_approve` - Monitor approval
- `order_reject` - Monitor rejection
- `order_deliver` - Final delivery

### Moderation Actions
Approve/reject operations also write to `moderation_actions`:
```sql
INSERT INTO moderation_actions(
  actor_id, target_kind, target_id, action, reason, created_at
) VALUES (
  monitor_id, 'order', order_id, 'approve', 'Quality approved', now()
);
```

## Performance Considerations

### Database Indexes
Required indexes for RLS performance:
- `orders(user_id)` - Client order access
- `orders(assigned_reader)` - Reader order access  
- `media_assets(owner_id)` - Media ownership checks

### Query Optimization
- RLS policies use indexed columns
- Role lookups cached per request
- Avoid N+1 queries in list endpoints

## Testing

### Test Coverage
- State machine transitions (all valid/invalid paths)
- Role-based access control (positive/negative cases)  
- RLS parity (route guards match DB policies)
- Audit trail verification
- Integration workflows (happy path + error cases)

### Running Tests
```bash
# Full test suite
pytest test_orders_workflow.py -v

# Smoke tests only  
python test_orders_workflow.py

# State machine tests
pytest test_orders_workflow.py::TestOrdersWorkflowStateTransitions -v
```

## Integration Points

### M16.2 RLS Integration
- Route guards call M16.2 helper functions:
  - `can_access_order(user_id, order_id)`
  - `can_access_media_asset(user_id, asset_id)`
- Database policies automatically enforce access control

### M22 Notifications (Future)
- Delivery triggers notification hooks
- Status changes generate client notifications
- Push campaigns for workflow events

### Storage Integration  
- Media upload via Supabase signed URLs
- Private bucket with RLS-consistent access
- Permanent retention until admin deletion

## Known Limitations

1. **Manual Delivery**: Requires admin intervention for `approved → delivered`
2. **Single Reader**: No multi-reader collaborative workflows  
3. **Linear Workflow**: No parallel approval processes
4. **Text Responses**: Limited text-only output validation
5. **Notification Dependencies**: M22 integration pending for client notifications

## Extending the Workflow

### Adding New Status
1. Update `order_status` enum in database
2. Add transition rules in state validation
3. Update route guard logic  
4. Add audit events
5. Update tests and documentation

### Adding New Roles
1. Update role-based access checks
2. Modify RLS policies if needed
3. Add route guard exceptions
4. Update test matrix

### Custom Workflow Steps
1. Add new endpoints following existing patterns
2. Ensure RLS parity with helper functions
3. Add state transition validation
4. Include audit logging
5. Write comprehensive tests

## Migration Impact

### Backward Compatibility
- Existing endpoints maintained
- `/result` endpoint redirects to `/output`
- Status transitions remain valid
- Audit logs preserve history

### Database Changes
No schema changes required - uses existing tables:
- `orders` (status transitions)
- `media_assets` (output files)
- `moderation_actions` (approve/reject log)
- `audit_log` (complete trail)

### API Changes
- Added: `POST /api/orders/{id}/deliver`
- Modified: Separated approve/deliver operations
- Enhanced: RLS route guard integration
- Improved: State transition validation