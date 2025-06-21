// ===============================================
// CALL API INTEGRATION TESTS
// ===============================================

const request = require('supertest');
const app = require('../../src/api/index');
const { supabase } = require('../../src/api/lib/supabase');

describe('Call API Routes', () => {
  let authToken;
  let clientUser;
  let readerUser;
  let testBooking;
  let testService;

  beforeAll(async () => {
    // Create test users
    const { data: clientUserData, error: clientError } = await supabase.auth.signUp({
      email: 'testclient@example.com',
      password: 'testpass123'
    });

    const { data: readerUserData, error: readerError } = await supabase.auth.signUp({
      email: 'testreader@example.com',
      password: 'testpass123'
    });

    if (clientError || readerError) {
      throw new Error('Failed to create test users');
    }

    clientUser = clientUserData.user;
    readerUser = readerUserData.user;

    // Set client as authenticated user for tests
    authToken = clientUserData.session.access_token;

    // Create reader profile
    await supabase
      .from('profiles')
      .update({ role: 'reader', first_name: 'Test', last_name: 'Reader' })
      .eq('id', readerUser.id);

    // Create test service
    const { data: serviceData } = await supabase
      .from('services')
      .insert({
        name: 'Test Tarot Reading',
        type: 'tarot',
        price: 25.00,
        duration_minutes: 30
      })
      .select()
      .single();

    testService = serviceData;

    // Create test booking
    const { data: bookingData } = await supabase
      .from('bookings')
      .insert({
        user_id: clientUser.id,
        reader_id: readerUser.id,
        service_id: testService.id,
        status: 'confirmed'
      })
      .select()
      .single();

    testBooking = bookingData;

    // Create reader availability
    await supabase
      .from('reader_availability')
      .insert({
        reader_id: readerUser.id,
        is_available: true,
        emergency_available: true
      });
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('call_sessions').delete().eq('client_id', clientUser.id);
    await supabase.from('bookings').delete().eq('id', testBooking.id);
    await supabase.from('services').delete().eq('id', testService.id);
    await supabase.from('reader_availability').delete().eq('reader_id', readerUser.id);
    await supabase.from('profiles').delete().eq('id', clientUser.id);
    await supabase.from('profiles').delete().eq('id', readerUser.id);
  });

  describe('POST /api/calls/sessions', () => {
    it('should create a new call session successfully', async () => {
      const callData = {
        reader_id: readerUser.id,
        booking_id: testBooking.id,
        call_type: 'voice',
        is_emergency: false,
        scheduled_duration: 30
      };

      const response = await request(app)
        .post('/api/calls/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.client_id).toBe(clientUser.id);
      expect(response.body.data.reader_id).toBe(readerUser.id);
      expect(response.body.data.call_type).toBe('voice');
      expect(response.body.data.status).toBe('pending');
    });

    it('should create an emergency call successfully', async () => {
      const emergencyData = {
        reader_id: readerUser.id,
        call_type: 'voice',
        is_emergency: true
      };

      const response = await request(app)
        .post('/api/calls/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emergencyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_emergency).toBe(true);
    });

    it('should fail when reader is unavailable', async () => {
      // Make reader unavailable
      await supabase
        .from('reader_availability')
        .update({ is_available: false })
        .eq('reader_id', readerUser.id);

      const callData = {
        reader_id: readerUser.id,
        call_type: 'voice',
        is_emergency: false
      };

      const response = await request(app)
        .post('/api/calls/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(callData)
        .expect(400);

      expect(response.body.error).toBe('Reader is not available');
      expect(response.body.code).toBe('READER_UNAVAILABLE');

      // Restore availability
      await supabase
        .from('reader_availability')
        .update({ is_available: true })
        .eq('reader_id', readerUser.id);
    });

    it('should require authentication', async () => {
      const callData = {
        reader_id: readerUser.id,
        call_type: 'voice'
      };

      await request(app)
        .post('/api/calls/sessions')
        .send(callData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        call_type: 'voice'
        // Missing reader_id
      };

      const response = await request(app)
        .post('/api/calls/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('reader_id');
    });
  });

  describe('GET /api/calls/sessions', () => {
    let testCallSession;

    beforeAll(async () => {
      // Create a test call session
      const { data } = await supabase
        .from('call_sessions')
        .insert({
          client_id: clientUser.id,
          reader_id: readerUser.id,
          room_id: 'test_room_123',
          call_type: 'voice',
          status: 'pending'
        })
        .select()
        .single();

      testCallSession = data;
    });

    afterAll(async () => {
      await supabase
        .from('call_sessions')
        .delete()
        .eq('id', testCallSession.id);
    });

    it('should retrieve call sessions for client', async () => {
      const response = await request(app)
        .get('/api/calls/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter by call status', async () => {
      const response = await request(app)
        .get('/api/calls/sessions?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(session => {
        expect(session.status).toBe('pending');
      });
    });

    it('should filter by call type', async () => {
      const response = await request(app)
        .get('/api/calls/sessions?call_type=voice')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(session => {
        expect(session.call_type).toBe('voice');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/calls/sessions?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/calls/sessions/:id', () => {
    let testCallSession;

    beforeAll(async () => {
      const { data } = await supabase
        .from('call_sessions')
        .insert({
          client_id: clientUser.id,
          reader_id: readerUser.id,
          room_id: 'test_room_456',
          call_type: 'video',
          status: 'active'
        })
        .select()
        .single();

      testCallSession = data;
    });

    afterAll(async () => {
      await supabase
        .from('call_sessions')
        .delete()
        .eq('id', testCallSession.id);
    });

    it('should retrieve specific call session', async () => {
      const response = await request(app)
        .get(`/api/calls/sessions/${testCallSession.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testCallSession.id);
      expect(response.body.data.client_id).toBe(clientUser.id);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/calls/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Call session not found');
      expect(response.body.code).toBe('SESSION_NOT_FOUND');
    });

    it('should deny access to other users sessions', async () => {
      // Create another user and session
      const { data: otherUserData } = await supabase.auth.signUp({
        email: 'otheruser@example.com',
        password: 'testpass123'
      });

      const { data: otherSession } = await supabase
        .from('call_sessions')
        .insert({
          client_id: otherUserData.user.id,
          reader_id: readerUser.id,
          room_id: 'other_room_789',
          call_type: 'voice',
          status: 'pending'
        })
        .select()
        .single();

      const response = await request(app)
        .get(`/api/calls/sessions/${otherSession.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.code).toBe('ACCESS_DENIED');

      // Cleanup
      await supabase.from('call_sessions').delete().eq('id', otherSession.id);
      await supabase.from('profiles').delete().eq('id', otherUserData.user.id);
    });
  });

  describe('PATCH /api/calls/sessions/:id/status', () => {
    let testCallSession;

    beforeAll(async () => {
      const { data } = await supabase
        .from('call_sessions')
        .insert({
          client_id: clientUser.id,
          reader_id: readerUser.id,
          room_id: 'test_room_status',
          call_type: 'voice',
          status: 'pending'
        })
        .select()
        .single();

      testCallSession = data;
    });

    afterAll(async () => {
      await supabase
        .from('call_sessions')
        .delete()
        .eq('id', testCallSession.id);
    });

    it('should update call session status', async () => {
      const updateData = {
        status: 'active',
        start_time: new Date().toISOString()
      };

      const response = await request(app)
        .patch(`/api/calls/sessions/${testCallSession.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.start_time).toBeTruthy();
    });

    it('should reject invalid status', async () => {
      const updateData = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .patch(`/api/calls/sessions/${testCallSession.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Invalid status');
      expect(response.body.code).toBe('INVALID_STATUS');
    });
  });

  describe('POST /api/calls/emergency', () => {
    it('should create emergency call successfully', async () => {
      const emergencyData = {
        emergency_type: 'urgent',
        priority_level: 4,
        notes: 'Test emergency call'
      };

      const response = await request(app)
        .post('/api/calls/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emergencyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toHaveProperty('id');
      expect(response.body.data.emergency_log).toHaveProperty('id');
      expect(response.body.data.session.is_emergency).toBe(true);
      expect(response.body.data.emergency_log.priority_level).toBe(4);
    });

    it('should handle no available emergency readers', async () => {
      // Make reader unavailable for emergency
      await supabase
        .from('reader_availability')
        .update({ emergency_available: false })
        .eq('reader_id', readerUser.id);

      const emergencyData = {
        emergency_type: 'urgent',
        priority_level: 5
      };

      const response = await request(app)
        .post('/api/calls/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emergencyData)
        .expect(503);

      expect(response.body.error).toBe('No emergency readers available');
      expect(response.body.code).toBe('NO_EMERGENCY_READERS');

      // Restore emergency availability
      await supabase
        .from('reader_availability')
        .update({ emergency_available: true })
        .eq('reader_id', readerUser.id);
    });
  });

  describe('PUT /api/calls/availability', () => {
    it('should require reader role', async () => {
      const availabilityData = {
        is_available: true,
        emergency_available: true
      };

      const response = await request(app)
        .put('/api/calls/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send(availabilityData)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });

    it('should update reader availability for reader user', async () => {
      // Create reader session token
      const { data: readerSession } = await supabase.auth.signInWithPassword({
        email: 'testreader@example.com',
        password: 'testpass123'
      });

      const availabilityData = {
        is_available: false,
        emergency_available: true,
        status_message: 'On break',
        max_concurrent_calls: 2
      };

      const response = await request(app)
        .put('/api/calls/availability')
        .set('Authorization', `Bearer ${readerSession.session.access_token}`)
        .send(availabilityData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_available).toBe(false);
      expect(response.body.data.status_message).toBe('On break');
      expect(response.body.data.max_concurrent_calls).toBe(2);
    });
  });

  describe('GET /api/calls/availability', () => {
    it('should retrieve all reader availability', async () => {
      const response = await request(app)
        .get('/api/calls/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/calls/sessions/:id/metrics', () => {
    let testCallSession;

    beforeAll(async () => {
      const { data } = await supabase
        .from('call_sessions')
        .insert({
          client_id: clientUser.id,
          reader_id: readerUser.id,
          room_id: 'test_room_metrics',
          call_type: 'video',
          status: 'active'
        })
        .select()
        .single();

      testCallSession = data;
    });

    afterAll(async () => {
      await supabase
        .from('call_quality_metrics')
        .delete()
        .eq('call_session_id', testCallSession.id);
      await supabase
        .from('call_sessions')
        .delete()
        .eq('id', testCallSession.id);
    });

    it('should submit call quality metrics', async () => {
      const metricsData = {
        audio_quality: 4,
        video_quality: 3,
        connection_strength: 5,
        latency: 150,
        packet_loss: 0.5,
        bandwidth_usage: 1200
      };

      const response = await request(app)
        .post(`/api/calls/sessions/${testCallSession.id}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(metricsData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.audio_quality).toBe(4);
      expect(response.body.data.video_quality).toBe(3);
      expect(response.body.data.latency).toBe(150);
    });

    it('should validate quality metrics range', async () => {
      const invalidMetrics = {
        audio_quality: 6, // Invalid: should be 1-5
        video_quality: 0  // Invalid: should be 1-5
      };

      const response = await request(app)
        .post(`/api/calls/sessions/${testCallSession.id}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMetrics)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });
  });

  describe('GET /api/calls/sessions/:id/recordings', () => {
    let testCallSession;

    beforeAll(async () => {
      const { data: sessionData } = await supabase
        .from('call_sessions')
        .insert({
          client_id: clientUser.id,
          reader_id: readerUser.id,
          room_id: 'test_room_recordings',
          call_type: 'video',
          status: 'ended'
        })
        .select()
        .single();

      testCallSession = sessionData;

      // Create test recording
      await supabase
        .from('call_recordings')
        .insert({
          call_session_id: testCallSession.id,
          recording_url: 'https://example.com/recording.mp4',
          recording_type: 'video',
          duration: 1800,
          file_size: 104857600,
          created_by: readerUser.id
        });
    });

    afterAll(async () => {
      await supabase
        .from('call_recordings')
        .delete()
        .eq('call_session_id', testCallSession.id);
      await supabase
        .from('call_sessions')
        .delete()
        .eq('id', testCallSession.id);
    });

    it('should retrieve call recordings', async () => {
      const response = await request(app)
        .get(`/api/calls/sessions/${testCallSession.id}/recordings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('recording_url');
    });
  });
});

// ===============================================
// MOCK FUNCTIONS FOR TESTING
// ===============================================

// Mock socket authentication for testing
jest.mock('../../src/api/lib/socket-auth', () => ({
  socketAuth: {
    isConnected: jest.fn(() => false),
    emit: jest.fn(),
    broadcast: jest.fn()
  }
}));

// Mock external services
jest.mock('../../src/api/lib/external-services', () => ({
  webrtc: {
    createRoom: jest.fn().mockResolvedValue({ roomId: 'mock_room_123' })
  },
  notifications: {
    sendPushNotification: jest.fn().mockResolvedValue(true)
  }
})); 