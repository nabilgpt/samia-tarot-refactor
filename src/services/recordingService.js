import { supabase /*, safeTableQuery*/ } from '../lib/supabase.js';

export class RecordingService {
  static mediaRecorder = null;
  static recordedChunks = [];
  static currentRecording = null;
  static isRecording = false;

  /**
   * Start automatic recording for a call
   * @param {Object} callData - Call information
   * @param {string} callData.bookingId - Booking ID
   * @param {string} callData.clientId - Client user ID
   * @param {string} callData.readerId - Reader user ID
   * @param {string} callData.callType - 'voice' or 'video'
   * @param {MediaStream} stream - Media stream to record
   * @returns {Promise<Object>} Recording result
   */
  static async startAutoRecording(callData, stream) {
    try {
      console.log('Starting automatic recording for call:', callData.bookingId);

      // Create recording entry in database
      const { data: recording, error: dbError } = await supabase
        .from('call_recordings')
        .insert([{
          booking_id: callData.bookingId,
          client_id: callData.clientId,
          reader_id: callData.readerId,
          call_type: callData.callType,
          call_start_time: new Date().toISOString(),
          auto_recorded: true,
          ai_monitored: true
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      this.currentRecording = recording;

      // Start media recording
      const recordingResult = await this.startMediaRecording(stream, recording.id);
      
      if (recordingResult.success) {
        this.isRecording = true;
        
        // Start AI monitoring
        await this.startAIMonitoring(recording.id, stream);
        
        return {
          success: true,
          recordingId: recording.id,
          message: 'Auto-recording started successfully'
        };
      } else {
        throw new Error(recordingResult.error);
      }
    } catch (error) {
      console.error('Error starting auto-recording:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to start auto-recording'
      };
    }
  }

  /**
   * Start media recording using MediaRecorder API
   * @param {MediaStream} stream - Media stream
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} Result
   */
  static async startMediaRecording(stream, recordingId) {
    try {
      this.recordedChunks = [];
      
      // Configure MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus'
      };

      // Fallback for different browsers
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = '';
          }
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingStop(recordingId);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
      };

      // Start recording with 1-second intervals
      this.mediaRecorder.start(1000);

      return {
        success: true,
        message: 'Media recording started'
      };
    } catch (error) {
      console.error('Error starting media recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop recording
   * @param {boolean} clientRequested - Whether client requested stop
   * @returns {Promise<Object>} Result
   */
  static async stopRecording(clientRequested = false) {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        return {
          success: false,
          message: 'No active recording to stop'
        };
      }

      // Update database if client stopped recording
      if (clientRequested && this.currentRecording) {
        await supabase
          .from('call_recordings')
          .update({
            client_stopped_recording: true,
            call_end_time: new Date().toISOString()
          })
          .eq('id', this.currentRecording.id);
      }

      this.mediaRecorder.stop();
      this.isRecording = false;

      return {
        success: true,
        message: 'Recording stopped successfully'
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle recording stop and upload
   * @param {string} recordingId - Recording ID
   */
  static async handleRecordingStop(recordingId) {
    try {
      if (this.recordedChunks.length === 0) {
        console.warn('No recorded data available');
        return;
      }

      // Create blob from recorded chunks
      const blob = new Blob(this.recordedChunks, {
        type: 'video/webm'
      });

      // Calculate duration and file size
      const fileSize = blob.size;
      const endTime = new Date().toISOString();

      // Upload to storage
      const uploadResult = await this.uploadRecording(blob, recordingId);

      if (uploadResult.success) {
        // Update database with recording details
        await supabase
          .from('call_recordings')
          .update({
            recording_url: uploadResult.url,
            storage_path: uploadResult.path,
            file_size: fileSize,
            call_end_time: endTime,
            duration_seconds: this.calculateDuration()
          })
          .eq('id', recordingId);

        console.log('Recording uploaded and database updated successfully');
      } else {
        console.error('Failed to upload recording:', uploadResult.error);
      }

      // Clean up
      this.recordedChunks = [];
      this.currentRecording = null;
    } catch (error) {
      console.error('Error handling recording stop:', error);
    }
  }

  /**
   * Upload recording to secure cloud storage
   * @param {Blob} blob - Recording blob
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} Upload result
   */
  static async uploadRecording(blob, recordingId) {
    try {
      const fileName = `call-recordings/${recordingId}-${Date.now()}.webm`;
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('recordings')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
        message: 'Recording uploaded successfully'
      };
    } catch (error) {
      console.error('Error uploading recording:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to upload recording'
      };
    }
  }

  /**
   * Calculate recording duration
   * @returns {number} Duration in seconds
   */
  static calculateDuration() {
    if (!this.currentRecording) return 0;
    
    const startTime = new Date(this.currentRecording.call_start_time);
    const endTime = new Date();
    return Math.floor((endTime - startTime) / 1000);
  }

  /**
   * Start AI monitoring for the call
   * @param {string} recordingId - Recording ID
   * @param {MediaStream} stream - Media stream
   */
  static async startAIMonitoring(recordingId, stream) {
    try {
      // This would integrate with AI monitoring service
      console.log('AI monitoring started for recording:', recordingId);
      
      // Import and start AI monitoring
      const { AIWatchdogService } = await import('./aiWatchdogService');
      await AIWatchdogService.startCallMonitoring(recordingId, stream);
    } catch (error) {
      console.error('Error starting AI monitoring:', error);
    }
  }

  /**
   * Get all recordings for admin/monitor dashboard
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Recordings list
   */
  static async getRecordings(filters = {}) {
    try {
      let query = supabase
        .from('call_recordings')
        .select(`
          *,
          client:profiles!call_recordings_client_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!call_recordings_reader_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          booking:bookings(
            service_type,
            status
          )
        `)
        .order('call_start_time', { ascending: false });

      // Apply filters
      if (filters.readerId) {
        query = query.eq('reader_id', filters.readerId);
      }
      
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.flagged) {
        query = query.eq('monitor_flagged', true);
      }
      
      if (filters.aiAlerted) {
        query = query.eq('ai_alerted', true);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Recordings retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching recordings:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch recordings'
      };
    }
  }

  /**
   * Flag a recording by monitor
   * @param {string} recordingId - Recording ID
   * @param {string} monitorId - Monitor user ID
   * @param {string} notes - Monitor notes
   * @returns {Promise<Object>} Result
   */
  static async flagRecording(recordingId, monitorId, notes) {
    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .update({
          monitor_flagged: true,
          monitor_notes: notes,
          flagged_by: monitorId,
          flagged_at: new Date().toISOString()
        })
        .eq('id', recordingId)
        .select()
        .single();

      if (error) throw error;

      // Log monitor activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: monitorId,
          activity_type: 'content_flagged',
          call_recording_id: recordingId,
          notes: notes
        }]);

      return {
        success: true,
        data: data,
        message: 'Recording flagged successfully'
      };
    } catch (error) {
      console.error('Error flagging recording:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to flag recording'
      };
    }
  }

  /**
   * Delete recording (admin only)
   * @param {string} recordingId - Recording ID
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Result
   */
  static async deleteRecording(recordingId, adminId) {
    try {
      // Get recording details first
      const { data: recording, error: fetchError } = await supabase
        .from('call_recordings')
        .select('storage_path')
        .eq('id', recordingId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (recording.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('recordings')
          .remove([recording.storage_path]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('call_recordings')
        .delete()
        .eq('id', recordingId);

      if (deleteError) throw deleteError;

      // Log admin activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: adminId,
          activity_type: 'content_flagged',
          call_recording_id: recordingId,
          action_details: { action: 'deleted' },
          notes: 'Recording deleted by admin'
        }]);

      return {
        success: true,
        message: 'Recording deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting recording:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete recording'
      };
    }
  }

  /**
   * Get recording statistics
   * @returns {Promise<Object>} Statistics
   */
  static async getRecordingStats() {
    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .select('id, ai_alerted, monitor_flagged, duration_seconds, file_size');

      if (error) throw error;

      const stats = {
        totalRecordings: data.length,
        aiAlerted: data.filter(r => r.ai_alerted).length,
        monitorFlagged: data.filter(r => r.monitor_flagged).length,
        totalDuration: data.reduce((sum, r) => sum + (r.duration_seconds || 0), 0),
        totalSize: data.reduce((sum, r) => sum + (r.file_size || 0), 0)
      };

      return {
        success: true,
        data: stats,
        message: 'Recording statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching recording stats:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch recording statistics'
      };
    }
  }
}

export default RecordingService;
