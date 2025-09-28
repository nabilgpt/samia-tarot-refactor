const SIGNED_URL_TTL_SECONDS = 900;

const ensureOk = async (res) => {
  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: `HTTP ${res.status}` };
    }

    const error = new Error(errorData.message || `HTTP ${res.status}`);
    error.code = errorData.code || `HTTP_${res.status}`;
    error.details = errorData.details;
    error.correlationId = errorData.correlation_id;
    error.status = res.status;
    throw error;
  }
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

const getProfile = async () => {
  try {
    const response = await fetch('/api/profile/me', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    });
    return ensureOk(response);
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

const getServices = async () => {
  try {
    const response = await fetch('/api/services');
    const data = await ensureOk(response);
    return Array.isArray(data?.services) ? data.services : [];
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
};

const createOrder = async (payload) => {
  const response = await fetch('http://localhost:5000/api/orders', {
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
    const response = await fetch(`/api/payments/invoice/${orderId}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    });
    const data = await ensureOk(response);

    if (data.signedUrl) {
      return {
        signedUrl: data.signedUrl,
        expiresAt: data.expiresAt,
        fileName: data.fileName
      };
    }

    return data;
  },

  openInvoiceInNewTab: (signedUrl) => {
    const win = window.open(signedUrl, '_blank', 'noopener,noreferrer');
    if (win) {
      win.focus();
    }
    return win !== null;
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
      created_at: new Date('2024-01-15').toISOString(),
      total_orders: 8
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
    },
    {
      id: '4',
      name: 'David Martinez',
      email: 'david@example.com',
      role: 'monitor',
      status: 'active',
      last_seen: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date('2024-02-20').toISOString(),
      reviews_completed: 56
    },
    {
      id: '5',
      name: 'Lisa Anderson',
      email: 'lisa@example.com',
      role: 'reader',
      status: 'active',
      last_seen: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date('2024-03-10').toISOString(),
      total_readings: 89,
      rating: 4.9
    },
    {
      id: '6',
      name: 'John Smith',
      email: 'john@example.com',
      role: 'client',
      status: 'inactive',
      last_seen: new Date(Date.now() - 86400000 * 7).toISOString(),
      created_at: new Date('2024-01-05').toISOString(),
      total_orders: 3
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

const getMetrics = async () => {
  return {
    total_orders: 156,
    pending_orders: 12,
    completed_orders: 138,
    failed_orders: 6,
    total_revenue: 4280.50,
    total_users: 324,
    active_readers: 8,
    avg_completion_time: '18 minutes',
    revenue_growth: 23.5,
    order_growth: 15.8
  };
};

const getRateLimits = async () => {
  return [
    {
      id: '1',
      endpoint: '/api/orders',
      method: 'POST',
      limit: 10,
      window: '1 minute',
      current_usage: 7,
      status: 'active'
    },
    {
      id: '2',
      endpoint: '/api/horoscopes/daily',
      method: 'GET',
      limit: 100,
      window: '1 hour',
      current_usage: 45,
      status: 'active'
    },
    {
      id: '3',
      endpoint: '/api/payments/intent',
      method: 'POST',
      limit: 5,
      window: '1 minute',
      current_usage: 2,
      status: 'active'
    }
  ];
};

const getReaderQueue = async () => {
  return [
    {
      id: 'ord_001',
      order_id: 'ORD-2025-001',
      client_name: 'Sarah Johnson',
      service_name: 'Tarot Reading',
      status: 'pending',
      priority: 'high',
      created_at: new Date(Date.now() - 300000).toISOString(),
      amount: 25.00
    },
    {
      id: 'ord_002',
      order_id: 'ORD-2025-002',
      client_name: 'John Smith',
      service_name: 'Astrology Reading',
      status: 'pending',
      priority: 'normal',
      created_at: new Date(Date.now() - 600000).toISOString(),
      amount: 35.00
    }
  ];
};

const getMonitorReviews = async () => {
  return [
    {
      id: 'rev_001',
      order_id: 'ORD-2025-003',
      reader_name: 'Michael Chen',
      service_name: 'Tarot Reading',
      status: 'pending_review',
      completed_at: new Date(Date.now() - 180000).toISOString(),
      flagged: false
    },
    {
      id: 'rev_002',
      order_id: 'ORD-2025-004',
      reader_name: 'Lisa Anderson',
      service_name: 'Coffee Reading',
      status: 'pending_review',
      completed_at: new Date(Date.now() - 240000).toISOString(),
      flagged: true,
      flag_reason: 'Quality concern'
    }
  ];
};

const getMonitorCalls = async () => {
  return [
    {
      id: 'call_001',
      order_id: 'ORD-2025-005',
      reader_name: 'Michael Chen',
      client_name: 'Emma Davis',
      duration: '45 minutes',
      status: 'completed',
      started_at: new Date(Date.now() - 3600000).toISOString(),
      ended_at: new Date(Date.now() - 900000).toISOString()
    }
  ];
};

const getReadingsForReview = async (status = 'pending') => {
  const mockReadings = [
    {
      id: 'read_001',
      order_id: 'ORD-2025-100',
      service_name: 'Tarot Reading',
      service_type: 'tarot',
      client_name: 'Emma Davis',
      reader_name: 'Michael Chen',
      status: 'pending',
      completed_at: new Date(Date.now() - 300000).toISOString(),
      question: 'What does my future hold in terms of career?',
      content: 'The cards reveal a transformative period ahead. The Tower suggests unexpected changes, while the Star brings hope and renewal. Your career path is shifting toward creative endeavors...',
      word_count: 245,
      amount: 25.00,
      has_audio: true
    },
    {
      id: 'read_002',
      order_id: 'ORD-2025-101',
      service_name: 'Astrology Reading',
      service_type: 'astrology',
      client_name: 'Sarah Johnson',
      reader_name: 'Lisa Anderson',
      status: 'flagged',
      completed_at: new Date(Date.now() - 600000).toISOString(),
      question: 'What do the stars say about my love life?',
      content: 'Your Venus placement indicates strong romantic potential this month. With Mars in your 7th house, passionate connections are highlighted...',
      word_count: 180,
      amount: 35.00,
      has_audio: false
    }
  ];

  if (status === 'all') return mockReadings;
  return mockReadings.filter(r => r.status === status);
};

const approveReading = async (readingId) => {
  console.log('Approving reading:', readingId);
  return { success: true };
};

const rejectReading = async (readingId, reason) => {
  console.log('Rejecting reading:', readingId, 'Reason:', reason);
  return { success: true };
};

const getHoroscopeMedia = async (horoscopeId) => {
  const response = await fetch(`/api/horoscopes/${horoscopeId}/media`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-store, must-revalidate, private',
      'Pragma': 'no-cache'
    }
  });
  const data = await ensureOk(response);

  if (data.signedUrl) {
    return {
      signedUrl: data.signedUrl,
      expiresAt: data.expiresAt,
      mediaType: data.mediaType || 'audio'
    };
  }

  return data;
};

const getOrderMedia = async (orderId) => {
  const response = await fetch(`/api/orders/${orderId}/media`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-store, must-revalidate, private',
      'Pragma': 'no-cache'
    }
  });
  const data = await ensureOk(response);

  if (data.signedUrl) {
    return {
      signedUrl: data.signedUrl,
      expiresAt: data.expiresAt,
      mediaType: data.mediaType || 'audio'
    };
  }

  return data;
};

const openMediaInNewTab = (signedUrl) => {
  const win = window.open(signedUrl, '_blank', 'noopener,noreferrer');
  if (win) {
    win.focus();
  }
  return win !== null;
};

const getReaders = async () => {
  try {
    const response = await fetch('/api/readers');
    const data = await ensureOk(response);
    return Array.isArray(data?.readers) ? data.readers : [];
  } catch (error) {
    console.error('Error fetching readers:', error);
    return [];
  }
};

const getOnlineReaders = async () => {
  try {
    const response = await fetch('/api/readers/online', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store, private'
      }
    });
    const data = await ensureOk(response);
    return Array.isArray(data?.readers) ? data.readers : [];
  } catch (error) {
    console.error('Error fetching online readers:', error);
    return [];
  }
};

const getAvailability = async (readerId, date) => {
  try {
    const response = await fetch(`/api/availability?reader_id=${readerId}&date=${date}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store, private'
      }
    });
    const data = await ensureOk(response);
    return data.slots || [];
  } catch (error) {
    console.error('Error fetching availability:', error);
    return [];
  }
};

const initiateCall = async (payload) => {
  const response = await fetch('/api/calls/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return ensureOk(response);
};

const api = {
  getDailyHoroscopes,
  dailyHoroscopes: getDailyHoroscopes,
  getProfile,
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
  getMetrics,
  getRateLimits,
  getReaderQueue,
  getMonitorReviews,
  getMonitorCalls,
  getReadingsForReview,
  approveReading,
  rejectReading,
  getHoroscopeMedia,
  getOrderMedia,
  openMediaInNewTab,
  getReaders,
  getOnlineReaders,
  getAvailability,
  initiateCall,
  ensureOk,
  SIGNED_URL_TTL_SECONDS
};

export default api;