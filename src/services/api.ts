// API Service Layer - Frontend Binding to SAMIA-TAROT Backend
// Single service file connecting existing dashboards to psycopg2 backend APIs
// Zero theme changes - only exposes typed methods for API consumption

const API_BASE = '/api';

// Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface OrderData {
  id: number;
  status: string;
  question_text?: string;
  is_gold?: boolean;
  created_at: string;
  delivered_at?: string;
  service_name: string;
  service_code: string;
  user_id?: string;
  assigned_reader?: string;
}

export interface PaymentIntentRequest {
  order_id: number;
  promo_code?: string;
}

export interface PaymentIntentResponse {
  intent_id: number;
  provider_intent_id: string;
  client_secret?: string;
  amount_cents: number;
  currency: string;
  status: string;
}

export interface NotificationTemplateRequest {
  channel: 'email' | 'sms' | 'whatsapp';
  code: string;
  subject?: string;
  body: string;
}

export interface NotificationTestRequest {
  email?: string;
  phone?: string;
}

export interface VerifyPhoneRequest {
  phone: string;
}

export interface VerifyPhoneCheckRequest {
  phone: string;
  code: string;
}

export interface OrderCreateRequest {
  service_code: string;
  question_text?: string;
  is_gold?: boolean;
  input_media_id?: number;
}

export interface OrderAssignRequest {
  reader_id: string;
}

export interface OrderResultRequest {
  output_media_id: number;
}

export interface OrderModerationRequest {
  note?: string;
}

export interface RefundRequest {
  order_id: number;
  amount_cents: number;
  reason: string;
}

export interface MediaUploadRequest {
  file_data: string; // base64
  content_type: string;
  filename: string;
}

export interface CallScheduleRequest {
  service_code: 'direct_call' | 'healing';
  question_text?: string;
  scheduled_at: string; // ISO datetime
  timezone?: string;
}

export interface CallInitiateRequest {
  order_id: number;
  client_phone: string;
  reader_phone?: string;
}

export interface CallTerminateRequest {
  order_id: number;
  reason: string;
}

export interface BlockProfileRequest {
  profile_id: string;
  reason: string;
}

export interface HoroscopeRequest {
  zodiac: string;
  country?: string;
  ref_date?: string;
}

// API Error Classes
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ProfileIncompleteError extends ApiError {
  constructor(missing: string[]) {
    super(412, 'Profile incomplete', { missing });
    this.name = 'ProfileIncompleteError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(429, 'Rate limit exceeded', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(service: string) {
    super(503, `Service unavailable: ${service}`);
    this.name = 'ServiceUnavailableError';
  }
}

// Utility functions
function getHeaders(includeUserId = true): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeUserId) {
    // Get user ID from auth context/session storage
    const userId = getCurrentUserId();
    if (userId) {
      headers['X-User-ID'] = userId;
    }
  }

  return headers;
}

function getCurrentUserId(): string | null {
  // This would integrate with your auth context
  // For now, return null to be safe
  return null;
}

async function makeRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  // Handle specific error statuses
  if (response.status === 412) {
    const data = await response.json().catch(() => ({}));
    throw new ProfileIncompleteError(data.missing || []);
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
  }

  if (response.status === 503) {
    const data = await response.json().catch(() => ({}));
    throw new ServiceUnavailableError(data.detail || 'Unknown service');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.detail || 'Request failed', data);
  }

  return response.json();
}

// Auth & Verification Methods
export const authService = {
  async authStatus(): Promise<any> {
    return makeRequest('/auth/status');
  },

  async verifyPhoneStart(request: VerifyPhoneRequest): Promise<any> {
    return makeRequest('/verify/phone/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async verifyPhoneCheck(request: VerifyPhoneCheckRequest): Promise<any> {
    return makeRequest('/verify/phone/check', {
      method: 'POST', 
      body: JSON.stringify(request),
    });
  },
};

// Meta & Profile Methods
export const metaService = {
  async countries(): Promise<any[]> {
    return makeRequest('/meta/countries');
  },

  async zodiacs(): Promise<string[]> {
    return makeRequest('/meta/zodiacs');
  },

  async profileRequirements(): Promise<string[]> {
    return makeRequest('/meta/profile/requirements');
  },

  async profileComplete(payload: any): Promise<boolean> {
    const result = await makeRequest('/meta/profile/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return result.complete;
  },
};

// Orders Management
export const ordersService = {
  async createOrder(request: OrderCreateRequest): Promise<{ order_id: number; status: string }> {
    return makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async getOrder(id: number): Promise<OrderData> {
    return makeRequest(`/orders/${id}`);
  },

  async listOrders(params: { mine?: boolean } = {}): Promise<{ orders: OrderData[]; count: number }> {
    const query = params.mine ? '?mine=true' : '';
    return makeRequest(`/orders${query}`);
  },

  async assignReader(orderId: number, request: OrderAssignRequest): Promise<any> {
    return makeRequest(`/orders/${orderId}/assign`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async startOrder(orderId: number): Promise<any> {
    return makeRequest(`/orders/${orderId}/start`, {
      method: 'POST',
    });
  },

  async submitResult(orderId: number, request: OrderResultRequest): Promise<any> {
    return makeRequest(`/orders/${orderId}/result`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async approveOrder(orderId: number, request: OrderModerationRequest = {}): Promise<any> {
    return makeRequest(`/orders/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async rejectOrder(orderId: number, request: OrderModerationRequest): Promise<any> {
    return makeRequest(`/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// Media Upload
export const mediaService = {
  async uploadMedia(request: MediaUploadRequest): Promise<{ media_id: number; url: string }> {
    return makeRequest('/media/upload', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// Horoscopes
export const horoscopesService = {
  async daily(request: HoroscopeRequest): Promise<any> {
    const params = new URLSearchParams();
    params.append('zodiac', request.zodiac);
    if (request.country) params.append('country', request.country);
    if (request.ref_date) params.append('ref_date', request.ref_date);

    return makeRequest(`/horoscopes/daily?${params}`);
  },

  async ingest(): Promise<any> {
    return makeRequest('/horoscopes/ingest', { method: 'POST' });
  },

  async pending(): Promise<any[]> {
    return makeRequest('/horoscopes/pending');
  },

  async approve(id: number): Promise<any> {
    return makeRequest(`/horoscopes/${id}/approve`, { method: 'POST' });
  },

  async reject(id: number): Promise<any> {
    return makeRequest(`/horoscopes/${id}/reject`, { method: 'POST' });
  },

  async archive(params: { days: number }): Promise<any> {
    return makeRequest(`/horoscopes/archive?days=${params.days}`);
  },

  async regenerate(payload: any): Promise<any> {
    return makeRequest('/horoscopes/regenerate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Calls Management
export const callsService = {
  async scheduleCall(request: CallScheduleRequest): Promise<{ order_id: number; status: string }> {
    return makeRequest('/calls/schedule', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async initiateCall(request: CallInitiateRequest): Promise<any> {
    return makeRequest('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async terminateCall(request: CallTerminateRequest): Promise<any> {
    return makeRequest('/calls/terminate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// Moderation
export const moderationService = {
  async blockProfile(request: BlockProfileRequest): Promise<any> {
    return makeRequest('/mod/block', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async unblockProfile(profileId: string): Promise<any> {
    return makeRequest('/mod/unblock', {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId }),
    });
  },
};

// AI Assist (Internal for Readers)
export const assistService = {
  async assistDraft(payload: any): Promise<any> {
    return makeRequest('/assist/draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async assistSearch(payload: any): Promise<any> {
    return makeRequest('/assist/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getDrafts(orderId: number): Promise<any[]> {
    return makeRequest(`/assist/drafts/${orderId}`);
  },
};

// Operations & Analytics
export const opsService = {
  async snapshot(): Promise<any> {
    return makeRequest('/ops/snapshot');
  },

  async metrics(): Promise<any> {
    return makeRequest('/ops/metrics');
  },

  async exportZip(range: string, entities: string[]): Promise<any> {
    return makeRequest('/ops/export', {
      method: 'POST',
      body: JSON.stringify({ range, entities }),
    });
  },
};

// Payments
export const paymentsService = {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    return makeRequest('/payments/intent', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async getInvoice(id: number): Promise<{ invoice_id: number; download_url: string; expires_at: string }> {
    return makeRequest(`/payments/invoice/${id}`);
  },

  async refund(request: RefundRequest): Promise<any> {
    return makeRequest('/payments/refund', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async paymentMethods(): Promise<any> {
    return makeRequest('/payments/methods');
  },
};

// Notifications
export const notificationsService = {
  async upsertTemplate(request: NotificationTemplateRequest): Promise<any> {
    return makeRequest('/notif/template', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async testNotification(request: NotificationTestRequest): Promise<any> {
    return makeRequest('/notif/test', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async listTemplates(): Promise<any> {
    return makeRequest('/notif/templates');
  },

  async getNotificationLog(limit = 50): Promise<any> {
    return makeRequest(`/notif/log?limit=${limit}`);
  },
};

// Main API object for easy imports
export const api = {
  auth: authService,
  meta: metaService,
  orders: ordersService,
  media: mediaService,
  horoscopes: horoscopesService,
  calls: callsService,
  moderation: moderationService,
  assist: assistService,
  ops: opsService,
  payments: paymentsService,
  notifications: notificationsService,
};

// Helper functions for error handling in components
export const handleApiError = (error: any) => {
  if (error instanceof ProfileIncompleteError) {
    // Redirect to profile completion flow
    return {
      type: 'profile_incomplete',
      message: 'Please complete your profile first',
      missing: error.details?.missing || [],
    };
  }

  if (error instanceof RateLimitError) {
    const retryAfter = error.details?.retryAfter;
    return {
      type: 'rate_limit',
      message: `Too many requests. ${retryAfter ? `Try again in ${retryAfter} seconds.` : 'Please try again later.'}`,
      retryAfter,
    };
  }

  if (error instanceof ServiceUnavailableError) {
    return {
      type: 'service_unavailable',
      message: error.message,
    };
  }

  if (error instanceof ApiError) {
    return {
      type: 'api_error',
      message: error.message,
      status: error.status,
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
  };
};

export default api;