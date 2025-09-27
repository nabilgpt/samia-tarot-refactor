// Tiny fetch wrapper with safe defaults - checks response.ok before json()
const j = async (res: Response) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export const api = {
  // GET /api/horoscopes/daily → safe array fallback
  dailyHoroscopes: () =>
    fetch('/api/horoscopes/daily')
      .then(j)
      .then(d => Array.isArray(d?.horoscopes) ? d.horoscopes : [])
      .catch(() => []),

  // GET /api/services → safe array fallback
  getServices: () =>
    fetch('/api/services')
      .then(j)
      .then(d => Array.isArray(d?.services) ? d.services : [])
      .catch(() => []),

  // POST /api/orders
  createOrder: (payload: any) =>
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(j),

  // GET /api/orders/{id}
  getOrder: (id: string) =>
    fetch(`/api/orders/${id}`).then(j),

  // POST /api/payments/intent
  paymentIntent: (order_id: string) =>
    fetch('/api/payments/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id })
    }).then(j),

  // GET /api/payments/invoice/{order_id} → returns Signed URL
  invoiceUrl: (order_id: string) =>
    fetch(`/api/payments/invoice/${order_id}`).then(j),

  // Client endpoints
  getMyOrders: () =>
    fetch('/api/orders/my')
      .then(j)
      .then(d => Array.isArray(d?.orders) ? d.orders : [])
      .catch(() => []),

  // Reader endpoints
  getReaderQueue: () =>
    fetch('/api/reader/queue')
      .then(j)
      .then(d => Array.isArray(d?.orders) ? d.orders : [])
      .catch(() => []),

  acceptOrder: (orderId: string) =>
    fetch(`/api/reader/orders/${orderId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(j),

  updateOrderReading: (orderId: string, readingData: any) =>
    fetch(`/api/reader/orders/${orderId}/reading`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(readingData)
    }).then(j),

  // Monitor endpoints
  getReadingsForReview: (filter: string = 'pending') =>
    fetch(`/api/monitor/readings?filter=${filter}`)
      .then(j)
      .then(d => Array.isArray(d?.readings) ? d.readings : [])
      .catch(() => []),

  approveReading: (readingId: string) =>
    fetch(`/api/monitor/readings/${readingId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(j),

  rejectReading: (readingId: string, reason: string) =>
    fetch(`/api/monitor/readings/${readingId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(j),

  getActiveCalls: (filter: string = 'active') =>
    fetch(`/api/monitor/calls?filter=${filter}`)
      .then(j)
      .then(d => Array.isArray(d?.calls) ? d.calls : [])
      .catch(() => []),

  joinCallAsMonitor: (callId: string) =>
    fetch(`/api/monitor/calls/${callId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(j),

  endCall: (callId: string, reason: string) =>
    fetch(`/api/monitor/calls/${callId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(j),

  // Admin endpoints
  getAllUsers: (filter: string = 'all') =>
    fetch(`/api/admin/users?filter=${filter}`)
      .then(j)
      .then(d => Array.isArray(d?.users) ? d.users : [])
      .catch(() => []),

  createUser: (userData: any) =>
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }).then(j),

  updateUser: (userId: string, userData: any) =>
    fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }).then(j),

  deleteUser: (userId: string) =>
    fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    }).then(j),

  // Authentication endpoints (placeholder for future implementation)
  login: (credentials: any) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(j),

  register: (userData: any) =>
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }).then(j),
};