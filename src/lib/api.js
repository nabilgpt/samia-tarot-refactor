const ensureOk = async (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const getDailyHoroscopes = async () => {
  try {
    const response = await fetch('/api/horoscopes/daily');
    const data = await ensureOk(response);
    return Array.isArray(data?.horoscopes) ? data.horoscopes : [];
  } catch (error) {
    console.error('Error fetching horoscopes:', error);
    return [];
  }
};

const getServices = async () => {
  const services = [
    {
      id: 'tarot_basic',
      code: 'tarot_basic',
      name: 'Tarot Reading',
      description: 'Traditional tarot card reading',
      base_price: 25.00
    },
    {
      id: 'astrology',
      code: 'astrology',
      name: 'Astrology Reading',
      description: 'Birth chart and planetary analysis',
      base_price: 35.00
    },
    {
      id: 'numerology',
      code: 'numerology',
      name: 'Numerology Reading',
      description: 'Life path and destiny numbers',
      base_price: 20.00
    },
    {
      id: 'coffee',
      code: 'coffee',
      name: 'Coffee Reading',
      description: 'Traditional coffee cup reading',
      base_price: 30.00
    },
    {
      id: 'healing',
      code: 'healing',
      name: 'Spiritual Healing',
      description: 'Energy healing and guidance',
      base_price: 40.00
    },
    {
      id: 'direct_call',
      code: 'direct_call',
      name: 'Direct Call',
      description: 'Live reading session',
      base_price: 50.00
    }
  ];
  return services;
};

const createOrder = async (payload) => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return ensureOk(response);
};

const getOrder = async (orderId) => {
  const response = await fetch(`/api/orders/${orderId}`);
  return ensureOk(response);
};

const getMyOrders = async () => {
  try {
    const response = await fetch('/api/orders/my');
    const data = await ensureOk(response);
    return Array.isArray(data?.orders) ? data.orders : [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

const payments = {
  createPaymentIntent: async (payload) => {
    const response = await fetch('/api/payments/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return ensureOk(response);
  },

  getInvoice: async (orderId) => {
    const response = await fetch(`/api/payments/invoice/${orderId}`);
    return ensureOk(response);
  }
};

const getAllUsers = async (filter = 'all') => {
  const mockUsers = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'client',
      status: 'active',
      last_seen: new Date().toISOString(),
      created_at: new Date('2024-01-15').toISOString()
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael@example.com',
      role: 'reader',
      status: 'active',
      last_seen: new Date().toISOString(),
      created_at: new Date('2023-12-01').toISOString(),
      total_readings: 142,
      rating: 4.8
    },
    {
      id: '3',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      role: 'admin',
      status: 'active',
      last_seen: new Date().toISOString(),
      created_at: new Date('2023-10-10').toISOString()
    }
  ];

  if (filter === 'all') return mockUsers;
  return mockUsers.filter(u => u.role === filter || u.status === filter);
};

const createUser = async (userData) => {
  console.log('Creating user:', userData);
  return { id: Date.now().toString(), ...userData };
};

const updateUser = async (userId, userData) => {
  console.log('Updating user:', userId, userData);
  return { id: userId, ...userData };
};

const deleteUser = async (userId) => {
  console.log('Deleting user:', userId);
  return { success: true };
};

const api = {
  getDailyHoroscopes,
  dailyHoroscopes: getDailyHoroscopes,
  getServices,
  services: getServices,
  createOrder,
  getOrder,
  getMyOrders,
  payments,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  ensureOk
};

export default api;