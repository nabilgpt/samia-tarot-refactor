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