// M41: Performance Load Testing
// k6 script for key API endpoints
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp up to 50 VUs over 2 minutes
    { duration: '3m', target: 50 }, // Hold 50 VUs for 3 minutes
    { duration: '1m', target: 0 },  // Ramp down to 0 VUs over 1 minute
  ],
  thresholds: {
    // SLO targets per Master context
    'http_req_duration{endpoint:daily_horoscopes}': ['p(95)<300'], // ≤300ms p95 for horoscopes
    'http_req_duration{endpoint:orders}': ['p(95)<500'],          // ≤500ms p95 for orders
    'http_req_duration{endpoint:payments}': ['p(95)<500'],        // ≤500ms p95 for payments
    'http_req_failed': ['rate<0.01'],                             // <1% error rate
  },
};

const BASE_URL = 'http://localhost:8000';

export default function () {
  // Test 1: Daily horoscopes (public endpoint)
  const horoscopeResponse = http.get(
    `${BASE_URL}/api/horoscopes/daily?zodiac=Aries&date=2025-09-13`,
    { tags: { endpoint: 'daily_horoscopes' } }
  );
  
  check(horoscopeResponse, {
    'horoscope status is 200 or 404': (r) => [200, 404].includes(r.status),
    'horoscope response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Test 2: Orders creation (simulated)
  const orderPayload = {
    service_code: 'tarot_reading',
    user_notes: 'Performance test order',
    birth_info: {
      date: '1990-01-01',
      time: '12:00',
      place: 'Test City'
    }
  };

  const orderResponse = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify(orderPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'perf-test-user-id',
      },
      tags: { endpoint: 'orders' }
    }
  );

  check(orderResponse, {
    'order creation handles request': (r) => [200, 201, 400, 403].includes(r.status),
    'order response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test 3: Payment intent (simulated)
  const paymentPayload = {
    order_id: 'test-order-123',
    amount_cents: 2500,
    currency: 'USD'
  };

  const paymentResponse = http.post(
    `${BASE_URL}/api/payments/intent`,
    JSON.stringify(paymentPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'perf-test-user-id',
      },
      tags: { endpoint: 'payments' }
    }
  );

  check(paymentResponse, {
    'payment intent handles request': (r) => [200, 201, 400, 403, 503].includes(r.status),
    'payment response time < 500ms': (r) => r.timings.duration < 500,
  });
}