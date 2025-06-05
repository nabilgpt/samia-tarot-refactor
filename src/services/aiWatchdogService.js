import { supabase } from '../lib/supabase';

export class AIWatchdogService {
  static isMonitoring = false;
  static activeMonitoringSessions = new Map();
  static speechRecognition = null;
  static monitoringSettings = null;
  static emotionAnalyzer = null;
  static patternDetector = null;
  static alertDispatcher = null;

  /**
   * Initialize AI Watchdog Service with extended features
   */
  static async initialize() {
    try {
      // Load monitoring settings
      await this.loadMonitoringSettings();
      
      // Initialize speech recognition if available
      this.initializeSpeechRecognition();
      
      // Initialize emotion analyzer
      this.initializeEmotionAnalyzer();
      
      // Initialize pattern detector
      this.initializePatternDetector();
      
      // Initialize alert dispatcher
      this.initializeAlertDispatcher();
      
      console.log('AI Watchdog Service initialized with extended features');
      return { success: true };
    } catch (error) {
      console.error('Error initializing AI Watchdog:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load monitoring settings from database
   */
  static async loadMonitoringSettings() {
    try {
      const { data, error } = await supabase
        .from('monitoring_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      this.monitoringSettings = {};
      data.forEach(setting => {
        this.monitoringSettings[setting.setting_key] = setting.setting_value;
      });
    } catch (error) {
      console.error('Error loading monitoring settings:', error);
      // Use default settings
      this.monitoringSettings = {
        ai_monitoring_enabled: true,
        ai_risk_threshold: 70,
        real_time_alerts_enabled: true,
        voice_message_monitoring: true
      };
    }
  }

  /**
   * Initialize speech recognition for call monitoring
   */
  static initializeSpeechRecognition() {
    try {
      if ('webkitSpeechRecognition' in window) {
        this.speechRecognition = new window.webkitSpeechRecognition();
      } else if ('SpeechRecognition' in window) {
        this.speechRecognition = new window.SpeechRecognition();
      }

      if (this.speechRecognition) {
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'ar-SA'; // Arabic support
        
        console.log('Speech recognition initialized');
      }
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }

  /**
   * Initialize emotion analyzer for voice tone detection
   */
  static initializeEmotionAnalyzer() {
    this.emotionAnalyzer = {
      analyzeVoiceTone: (audioData) => {
        // Analyze audio patterns for emotional indicators
        const emotions = this.detectEmotionalPatterns(audioData);
        return emotions;
      },
      analyzeTextEmotion: (text) => {
        // Analyze text for emotional content
        return this.detectTextEmotions(text);
      }
    };
  }

  /**
   * Initialize pattern detector for behavioral analysis
   */
  static initializePatternDetector() {
    this.patternDetector = {
      userPatterns: new Map(),
      sessionPatterns: new Map(),
      
      analyzeUserBehavior: (userId, action, content) => {
        return this.analyzeUserBehaviorPattern(userId, action, content);
      },
      
      detectSuspiciousActivity: (sessionId, data) => {
        return this.detectSuspiciousSessionActivity(sessionId, data);
      }
    };
  }

  /**
   * Initialize alert dispatcher for real-time notifications
   */
  static initializeAlertDispatcher() {
    this.alertDispatcher = {
      sendRealTimeAlert: async (alertData) => {
        await this.dispatchRealTimeAlert(alertData);
      },
      
      escalateToHuman: async (escalationData) => {
        await this.escalateToHumanMonitor(escalationData);
      },
      
      autoPauseSession: async (sessionId, reason) => {
        await this.autoPauseSession(sessionId, reason);
      }
    };
  }

  /**
   * Enhanced call monitoring with emotion and pattern detection
   */
  static async startCallMonitoring(recordingId, stream) {
    try {
      if (!this.monitoringSettings?.ai_monitoring_enabled) {
        return { success: false, message: 'AI monitoring disabled' };
      }

      console.log('Starting enhanced AI call monitoring for:', recordingId);

      const monitoringSession = {
        recordingId,
        stream,
        startTime: new Date(),
        violations: [],
        transcription: '',
        riskScore: 0,
        emotionalState: 'neutral',
        behaviorPatterns: [],
        sessionTag: 'safe'
      };

      this.activeMonitoringSessions.set(recordingId, monitoringSession);

      // Start enhanced speech monitoring
      await this.startEnhancedSpeechMonitoring(recordingId, stream);

      // Start emotion detection
      await this.startEmotionDetection(recordingId, stream);

      // Start pattern analysis
      await this.startPatternAnalysis(recordingId);

      return {
        success: true,
        message: 'Enhanced AI call monitoring started'
      };
    } catch (error) {
      console.error('Error starting enhanced call monitoring:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enhanced speech monitoring with emotion detection
   */
  static async startEnhancedSpeechMonitoring(recordingId, stream) {
    try {
      if (!this.speechRecognition) return;

      const session = this.activeMonitoringSessions.get(recordingId);
      if (!session) return;

      this.speechRecognition.onresult = (event) => {
        let transcript = '';
        let confidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          confidence = event.results[i][0].confidence;
        }

        // Update session transcription
        session.transcription += transcript + ' ';

        // Enhanced analysis with emotion and patterns
        this.performEnhancedAnalysis(recordingId, transcript, confidence);
      };

      this.speechRecognition.start();
    } catch (error) {
      console.error('Error starting enhanced speech monitoring:', error);
    }
  }

  /**
   * Start emotion detection from voice tone
   */
  static async startEmotionDetection(recordingId, stream) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 2048;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const session = this.activeMonitoringSessions.get(recordingId);
      if (!session) return;

      // Analyze emotions every 500ms
      const emotionInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        
        const emotions = this.emotionAnalyzer.analyzeVoiceTone(dataArray);
        session.emotionalState = emotions.dominant;
        
        // Check for distress or aggressive emotions
        if (emotions.distress > 0.7 || emotions.anger > 0.8) {
          this.handleEmotionalAlert(recordingId, emotions);
        }
      }, 500);

      session.emotionInterval = emotionInterval;
    } catch (error) {
      console.error('Error starting emotion detection:', error);
    }
  }

  /**
   * Start pattern analysis for behavioral detection
   */
  static async startPatternAnalysis(recordingId) {
    try {
      const session = this.activeMonitoringSessions.get(recordingId);
      if (!session) return;

      // Analyze patterns every 2 seconds
      const patternInterval = setInterval(() => {
        const patterns = this.patternDetector.detectSuspiciousActivity(recordingId, {
          transcription: session.transcription,
          emotionalState: session.emotionalState,
          violations: session.violations,
          duration: Date.now() - session.startTime.getTime()
        });

        if (patterns.suspicious) {
          this.handlePatternAlert(recordingId, patterns);
        }
      }, 2000);

      session.patternInterval = patternInterval;
    } catch (error) {
      console.error('Error starting pattern analysis:', error);
    }
  }

  /**
   * Perform enhanced analysis with multiple detection layers
   */
  static performEnhancedAnalysis(recordingId, transcript, confidence) {
    try {
      const session = this.activeMonitoringSessions.get(recordingId);
      if (!session) return;

      // Text-based violation detection
      const textViolations = this.analyzeTranscript(recordingId, transcript);
      
      // Emotion analysis from text
      const textEmotions = this.emotionAnalyzer.analyzeTextEmotion(transcript);
      
      // Pattern analysis
      const behaviorPatterns = this.patternDetector.analyzeUserBehavior(
        session.userId, 
        'speech', 
        transcript
      );

      // Calculate comprehensive risk score
      const riskScore = this.calculateComprehensiveRiskScore({
        textViolations,
        textEmotions,
        behaviorPatterns,
        confidence,
        emotionalState: session.emotionalState
      });

      // Update session data
      session.riskScore = Math.max(session.riskScore, riskScore);
      session.behaviorPatterns.push(...behaviorPatterns);

      // Determine session tag
      session.sessionTag = this.determineSessionTag(session);

      // Handle escalation based on severity
      this.handleIntelligentEscalation(recordingId, {
        riskScore,
        violations: textViolations,
        emotions: textEmotions,
        patterns: behaviorPatterns
      });

    } catch (error) {
      console.error('Error in enhanced analysis:', error);
    }
  }

  /**
   * Detect emotional patterns from audio data
   */
  static detectEmotionalPatterns(audioData) {
    try {
      // Analyze frequency patterns for emotional indicators
      const average = audioData.reduce((sum, value) => sum + value, 0) / audioData.length;
      const peak = Math.max(...audioData);
      const variance = audioData.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / audioData.length;
      
      // Emotional pattern detection
      const anger = (peak > 200 && variance > 1500) ? Math.min((peak + variance) / 2000, 1) : 0;
      const distress = (variance > 2000 && average > 100) ? Math.min(variance / 3000, 1) : 0;
      const fear = (peak > 150 && variance > 1000 && average < 80) ? Math.min((peak + variance) / 2500, 1) : 0;
      const calm = (variance < 500 && peak < 100) ? 1 - (variance + peak) / 600 : 0;

      const emotions = { anger, distress, fear, calm };
      const dominant = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);

      return {
        ...emotions,
        dominant,
        confidence: Math.max(...Object.values(emotions))
      };
    } catch (error) {
      console.error('Error detecting emotional patterns:', error);
      return { anger: 0, distress: 0, fear: 0, calm: 1, dominant: 'calm', confidence: 0 };
    }
  }

  /**
   * Detect emotions from text content
   */
  static detectTextEmotions(text) {
    try {
      const emotionPatterns = {
        anger: [
          /\b(angry|mad|furious|rage|hate|damn|shit|fuck)\b/gi,
          /\b(غاضب|زعلان|مجنون|كره|لعنة)\b/gi
        ],
        fear: [
          /\b(scared|afraid|terrified|panic|help|emergency)\b/gi,
          /\b(خائف|مرعوب|فزع|مساعدة|طوارئ)\b/gi
        ],
        distress: [
          /\b(crying|sobbing|desperate|hopeless|suicidal)\b/gi,
          /\b(بكاء|يائس|منتحر|محبط)\b/gi
        ],
        threat: [
          /\b(kill|murder|hurt|harm|destroy|threat)\b/gi,
          /\b(قتل|إيذاء|تهديد|تدمير|ضرر)\b/gi
        ]
      };

      const emotions = {};
      let totalMatches = 0;

      Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
        let matches = 0;
        patterns.forEach(pattern => {
          const found = text.match(pattern);
          if (found) matches += found.length;
        });
        emotions[emotion] = matches;
        totalMatches += matches;
      });

      // Normalize scores
      Object.keys(emotions).forEach(emotion => {
        emotions[emotion] = totalMatches > 0 ? emotions[emotion] / totalMatches : 0;
      });

      const dominant = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);

      return {
        ...emotions,
        dominant,
        confidence: totalMatches > 0 ? Math.min(totalMatches / 10, 1) : 0
      };
    } catch (error) {
      console.error('Error detecting text emotions:', error);
      return { anger: 0, fear: 0, distress: 0, threat: 0, dominant: 'neutral', confidence: 0 };
    }
  }

  /**
   * Analyze user behavior patterns
   */
  static analyzeUserBehaviorPattern(userId, action, content) {
    try {
      if (!this.patternDetector.userPatterns.has(userId)) {
        this.patternDetector.userPatterns.set(userId, {
          actions: [],
          violations: [],
          emotionalStates: [],
          timestamps: []
        });
      }

      const userPattern = this.patternDetector.userPatterns.get(userId);
      const now = Date.now();

      // Add current action
      userPattern.actions.push(action);
      userPattern.timestamps.push(now);

      // Keep only recent data (last 24 hours)
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const recentIndices = userPattern.timestamps
        .map((timestamp, index) => timestamp > dayAgo ? index : -1)
        .filter(index => index !== -1);

      userPattern.actions = recentIndices.map(i => userPattern.actions[i]);
      userPattern.timestamps = recentIndices.map(i => userPattern.timestamps[i]);

      // Detect patterns
      const patterns = [];

      // Repetitive behavior
      if (userPattern.actions.length > 10) {
        const recentActions = userPattern.actions.slice(-10);
        const uniqueActions = new Set(recentActions);
        if (uniqueActions.size < 3) {
          patterns.push({
            type: 'repetitive_behavior',
            severity: 'medium',
            confidence: 0.8
          });
        }
      }

      // Rapid escalation
      const recentViolations = userPattern.violations.filter(v => v.timestamp > now - 60 * 60 * 1000);
      if (recentViolations.length > 3) {
        patterns.push({
          type: 'rapid_escalation',
          severity: 'high',
          confidence: 0.9
        });
      }

      return patterns;
    } catch (error) {
      console.error('Error analyzing user behavior pattern:', error);
      return [];
    }
  }

  /**
   * Detect suspicious session activity
   */
  static detectSuspiciousSessionActivity(sessionId, data) {
    try {
      const suspicious = {
        suspicious: false,
        reasons: [],
        severity: 'low'
      };

      // Check session duration vs content
      const duration = data.duration;
      const contentLength = data.transcription.length;
      
      if (duration > 30 * 60 * 1000 && contentLength < 100) { // 30 min with little content
        suspicious.suspicious = true;
        suspicious.reasons.push('unusually_long_silent_session');
        suspicious.severity = 'medium';
      }

      // Check emotional state consistency
      if (data.emotionalState === 'distress' || data.emotionalState === 'fear') {
        suspicious.suspicious = true;
        suspicious.reasons.push('sustained_distress');
        suspicious.severity = 'high';
      }

      // Check violation frequency
      if (data.violations.length > 5) {
        suspicious.suspicious = true;
        suspicious.reasons.push('multiple_violations');
        suspicious.severity = 'high';
      }

      return suspicious;
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return { suspicious: false, reasons: [], severity: 'low' };
    }
  }

  /**
   * Calculate comprehensive risk score
   */
  static calculateComprehensiveRiskScore(data) {
    try {
      let riskScore = 0;

      // Text violations weight
      if (data.textViolations && data.textViolations.length > 0) {
        riskScore += data.textViolations.length * 20;
      }

      // Emotional state weight
      if (data.textEmotions) {
        riskScore += data.textEmotions.anger * 30;
        riskScore += data.textEmotions.threat * 40;
        riskScore += data.textEmotions.distress * 25;
        riskScore += data.textEmotions.fear * 20;
      }

      // Voice emotion weight
      if (data.emotionalState === 'anger') riskScore += 25;
      if (data.emotionalState === 'distress') riskScore += 30;
      if (data.emotionalState === 'fear') riskScore += 20;

      // Behavior patterns weight
      if (data.behaviorPatterns) {
        data.behaviorPatterns.forEach(pattern => {
          if (pattern.severity === 'high') riskScore += 35;
          else if (pattern.severity === 'medium') riskScore += 20;
          else riskScore += 10;
        });
      }

      // Confidence adjustment
      if (data.confidence < 0.5) {
        riskScore *= 0.7; // Reduce score for low confidence
      }

      return Math.min(riskScore, 100);
    } catch (error) {
      console.error('Error calculating risk score:', error);
      return 0;
    }
  }

  /**
   * Determine session tag based on analysis
   */
  static determineSessionTag(session) {
    try {
      if (session.riskScore >= 80) return 'critical';
      if (session.riskScore >= 60) return 'suspicious';
      if (session.riskScore >= 30) return 'needs_review';
      return 'safe';
    } catch (error) {
      console.error('Error determining session tag:', error);
      return 'safe';
    }
  }

  /**
   * Handle intelligent escalation based on severity
   */
  static async handleIntelligentEscalation(recordingId, analysisData) {
    try {
      const { riskScore, violations, emotions, patterns } = analysisData;
      
      // Determine escalation level
      let escalationLevel = 'none';
      let actions = [];

      if (riskScore >= 90) {
        escalationLevel = 'critical';
        actions = ['alert_admin', 'alert_monitor', 'auto_pause', 'emergency_flag'];
      } else if (riskScore >= 70) {
        escalationLevel = 'high';
        actions = ['alert_admin', 'alert_monitor', 'flag_session'];
      } else if (riskScore >= 50) {
        escalationLevel = 'moderate';
        actions = ['alert_monitor', 'log_incident'];
      } else if (riskScore >= 30) {
        escalationLevel = 'low';
        actions = ['log_incident'];
      }

      // Execute actions
      for (const action of actions) {
        await this.executeEscalationAction(recordingId, action, analysisData);
      }

      // Log escalation
      await this.logEscalation(recordingId, escalationLevel, analysisData);

    } catch (error) {
      console.error('Error handling intelligent escalation:', error);
    }
  }

  /**
   * Execute specific escalation action
   */
  static async executeEscalationAction(recordingId, action, data) {
    try {
      switch (action) {
        case 'alert_admin':
          await this.alertDispatcher.sendRealTimeAlert({
            type: 'admin_alert',
            recordingId,
            severity: 'high',
            data
          });
          break;

        case 'alert_monitor':
          await this.alertDispatcher.sendRealTimeAlert({
            type: 'monitor_alert',
            recordingId,
            severity: 'medium',
            data
          });
          break;

        case 'auto_pause':
          await this.alertDispatcher.autoPauseSession(recordingId, 'AI_CRITICAL_VIOLATION');
          break;

        case 'emergency_flag':
          await this.createEmergencyFlag(recordingId, data);
          break;

        case 'flag_session':
          await this.flagSession(recordingId, data);
          break;

        case 'log_incident':
          await this.logIncident(recordingId, data);
          break;
      }
    } catch (error) {
      console.error(`Error executing escalation action ${action}:`, error);
    }
  }

  /**
   * Monitor chat messages for violations
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Analysis result
   */
  static async monitorChatMessage(messageData) {
    try {
      if (!this.monitoringSettings?.ai_monitoring_enabled) {
        return { success: false, message: 'AI monitoring disabled' };
      }

      const analysis = {
        messageId: messageData.id,
        riskScore: 0,
        flags: [],
        violations: [],
        emotions: {},
        sessionTag: 'safe'
      };

      // Enhanced text analysis
      if (messageData.content) {
        const textAnalysis = this.analyzeTextContent(messageData.content);
        const textEmotions = this.emotionAnalyzer.analyzeTextEmotion(messageData.content);
        
        analysis.riskScore += textAnalysis.riskScore;
        analysis.flags.push(...textAnalysis.flags);
        analysis.violations.push(...textAnalysis.violations);
        analysis.emotions = textEmotions;

        // Behavior pattern analysis
        const behaviorPatterns = this.patternDetector.analyzeUserBehavior(
          messageData.sender_id,
          'chat',
          messageData.content
        );

        // Calculate comprehensive risk score
        const comprehensiveRisk = this.calculateComprehensiveRiskScore({
          textViolations: textAnalysis.violations,
          textEmotions: textEmotions,
          behaviorPatterns: behaviorPatterns,
          confidence: 1.0
        });

        analysis.riskScore = comprehensiveRisk;
        analysis.sessionTag = this.determineSessionTagFromScore(comprehensiveRisk);
      }

      // Store enhanced monitoring record
      const { data, error } = await supabase
        .from('chat_monitoring')
        .insert([{
          booking_id: messageData.booking_id,
          message_id: messageData.id,
          client_id: messageData.sender_id,
          reader_id: messageData.receiver_id,
          message_content: messageData.content,
          message_type: messageData.type || 'text',
          voice_message_url: messageData.voice_url,
          ai_analyzed: true,
          ai_risk_score: analysis.riskScore,
          ai_flags: analysis.flags,
          ai_emotions: analysis.emotions,
          session_tag: analysis.sessionTag,
          ai_alerted: analysis.riskScore >= this.monitoringSettings.ai_risk_threshold
        }])
        .select()
        .single();

      if (error) throw error;

      // Intelligent escalation for chat
      if (analysis.riskScore >= this.monitoringSettings.ai_risk_threshold) {
        await this.handleChatEscalation(messageData, analysis);
      }

      return {
        success: true,
        analysis,
        message: 'Chat message analyzed with enhanced AI monitoring'
      };
    } catch (error) {
      console.error('Error monitoring chat message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze text content for violations
   * @param {string} content - Text content
   * @returns {Object} Analysis result
   */
  static analyzeTextContent(content) {
    try {
      const analysis = {
        riskScore: 0,
        flags: [],
        violations: []
      };

      // Profanity detection (Arabic and English)
      const profanityPatterns = [
        /\b(damn|shit|fuck|bitch)\b/gi,
        /\b(كلب|حمار|غبي|أحمق)\b/gi
      ];

      // Scam detection
      const scamPatterns = [
        /\b(send money|أرسل مال|تحويل فلوس)\b/gi,
        /\b(bank account|حساب بنكي|رقم حساب)\b/gi,
        /\b(credit card|بطاقة ائتمان)\b/gi
      ];

      // Personal info patterns
      const personalInfoPatterns = [
        /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/g, // Credit card pattern
        /\b(\d{3}[-\s]?\d{2}[-\s]?\d{4})\b/g, // SSN pattern
        /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g // Email pattern
      ];

      // Check patterns
      const checkPatterns = (patterns, category, weight) => {
        patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            analysis.riskScore += matches.length * weight;
            analysis.flags.push(category);
            analysis.violations.push({
              category,
              matches: matches.length,
              severity: matches.length > 2 ? 'high' : 'medium'
            });
          }
        });
      };

      checkPatterns(profanityPatterns, 'profanity', 15);
      checkPatterns(scamPatterns, 'scam', 30);
      checkPatterns(personalInfoPatterns, 'personal_info', 25);

      return analysis;
    } catch (error) {
      console.error('Error analyzing text content:', error);
      return { riskScore: 0, flags: [], violations: [] };
    }
  }

  /**
   * Trigger violation alert
   * @param {string} recordingId - Recording ID
   * @param {Object} violationData - Violation details
   */
  static async triggerViolationAlert(recordingId, violationData) {
    try {
      const session = this.activeMonitoringSessions.get(recordingId);
      if (!session) return;

      // Get recording details
      const { data: recording, error } = await supabase
        .from('call_recordings')
        .select('booking_id, client_id, reader_id')
        .eq('id', recordingId)
        .single();

      if (error) throw error;

      // Create AI alert
      await this.createAIAlert({
        alert_type: 'call_violation',
        severity: violationData.severity || 'medium',
        booking_id: recording.booking_id,
        call_recording_id: recordingId,
        client_id: recording.client_id,
        reader_id: recording.reader_id,
        violation_details: violationData,
        ai_confidence: Math.min(session.riskScore, 100)
      });

      // Update recording with AI alert flag
      await supabase
        .from('call_recordings')
        .update({ ai_alerted: true })
        .eq('id', recordingId);

      console.log('AI violation alert triggered for recording:', recordingId);
    } catch (error) {
      console.error('Error triggering violation alert:', error);
    }
  }

  /**
   * Create AI monitoring alert
   * @param {Object} alertData - Alert data
   * @returns {Promise<Object>} Result
   */
  static async createAIAlert(alertData) {
    try {
      const { data, error } = await supabase
        .from('ai_monitoring_alerts')
        .insert([alertData])
        .select()
        .single();

      if (error) throw error;

      // Send real-time notification to monitors and admins
      if (this.monitoringSettings?.real_time_alerts_enabled) {
        await this.sendRealTimeAlert(data);
      }

      return {
        success: true,
        data,
        message: 'AI alert created successfully'
      };
    } catch (error) {
      console.error('Error creating AI alert:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send real-time alert to monitors and admins
   * @param {Object} alertData - Alert data
   */
  static async sendRealTimeAlert(alertData) {
    try {
      // This would integrate with real-time notification system
      console.log('Sending real-time AI alert:', alertData);
      
      // Could integrate with:
      // - WebSocket notifications
      // - Push notifications
      // - Email alerts
      // - SMS alerts
    } catch (error) {
      console.error('Error sending real-time alert:', error);
    }
  }

  /**
   * Stop monitoring for a call
   * @param {string} recordingId - Recording ID
   */
  static stopCallMonitoring(recordingId) {
    try {
      const session = this.activeMonitoringSessions.get(recordingId);
      if (!session) return;

      // Stop speech recognition
      if (this.speechRecognition) {
        this.speechRecognition.stop();
      }

      // Stop emotion detection
      if (session.emotionInterval) {
        clearInterval(session.emotionInterval);
      }

      // Stop pattern analysis
      if (session.patternInterval) {
        clearInterval(session.patternInterval);
      }

      // Remove session
      this.activeMonitoringSessions.delete(recordingId);

      console.log('AI monitoring stopped for recording:', recordingId);
    } catch (error) {
      console.error('Error stopping call monitoring:', error);
    }
  }

  /**
   * Calculate severity based on category and frequency
   * @param {string} category - Violation category
   * @param {number} frequency - Number of occurrences
   * @returns {string} Severity level
   */
  static calculateSeverity(category, frequency) {
    const severityMap = {
      harassment: { low: 1, medium: 2, high: 3 },
      inappropriate: { low: 1, medium: 2, high: 4 },
      scam: { low: 1, medium: 1, high: 2 },
      personal_info: { low: 1, medium: 1, high: 2 }
    };

    const thresholds = severityMap[category] || { low: 1, medium: 2, high: 3 };

    if (frequency >= thresholds.high) return 'high';
    if (frequency >= thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Calculate alert severity based on risk score
   * @param {number} riskScore - Risk score
   * @returns {string} Alert severity
   */
  static calculateAlertSeverity(riskScore) {
    if (riskScore >= 90) return 'critical';
    if (riskScore >= 80) return 'high';
    if (riskScore >= 70) return 'medium';
    return 'low';
  }

  /**
   * Get AI monitoring statistics
   * @returns {Promise<Object>} Statistics
   */
  static async getMonitoringStats() {
    try {
      const { data: alerts, error: alertsError } = await supabase
        .from('ai_monitoring_alerts')
        .select('severity, resolved, created_at');

      const { data: chatMonitoring, error: chatError } = await supabase
        .from('chat_monitoring')
        .select('ai_risk_score, ai_alerted');

      if (alertsError || chatError) {
        throw alertsError || chatError;
      }

      const stats = {
        totalAlerts: alerts.length,
        alertsBySeverity: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        },
        resolvedAlerts: alerts.filter(a => a.resolved).length,
        activeMonitoringSessions: this.activeMonitoringSessions.size,
        chatMessagesAnalyzed: chatMonitoring.length,
        chatAlertsTriggered: chatMonitoring.filter(c => c.ai_alerted).length,
        averageRiskScore: chatMonitoring.length > 0 
          ? chatMonitoring.reduce((sum, c) => sum + c.ai_risk_score, 0) / chatMonitoring.length 
          : 0
      };

      return {
        success: true,
        data: stats,
        message: 'AI monitoring statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching monitoring stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Dispatch real-time alert to monitors and admins
   */
  static async dispatchRealTimeAlert(alertData) {
    try {
      const { type, recordingId, severity, data } = alertData;

      // Get recording details for context
      const { data: recording, error } = await supabase
        .from('call_recordings')
        .select('booking_id, client_id, reader_id')
        .eq('id', recordingId)
        .single();

      if (error) throw error;

      // Create comprehensive alert
      const alert = {
        alert_type: type === 'admin_alert' ? 'call_violation' : 'call_violation',
        severity: severity === 'high' ? 'critical' : severity,
        booking_id: recording.booking_id,
        call_recording_id: recordingId,
        client_id: recording.client_id,
        reader_id: recording.reader_id,
        violation_details: {
          ai_analysis: data,
          alert_type: type,
          timestamp: new Date().toISOString(),
          auto_generated: true
        },
        ai_confidence: data.riskScore || 0
      };

      // Create AI alert in database
      const result = await this.createAIAlert(alert);

      // Send real-time notifications via Supabase channels
      if (type === 'admin_alert') {
        await this.sendAdminNotification(alert);
      }
      
      if (type === 'monitor_alert' || type === 'admin_alert') {
        await this.sendMonitorNotification(alert);
      }

      return result;
    } catch (error) {
      console.error('Error dispatching real-time alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-pause session for critical violations
   */
  static async autoPauseSession(sessionId, reason) {
    try {
      // Get session details
      const { data: recording, error } = await supabase
        .from('call_recordings')
        .select('booking_id')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      // Update booking to paused status
      await supabase
        .from('bookings')
        .update({
          status: 'paused',
          pause_reason: reason,
          paused_at: new Date().toISOString(),
          paused_by_ai: true
        })
        .eq('id', recording.booking_id);

      // Log the auto-pause action
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: null, // AI system
          activity_type: 'call_stopped',
          target_booking_id: recording.booking_id,
          call_recording_id: sessionId,
          action_details: {
            action: 'ai_auto_pause',
            reason: reason,
            timestamp: new Date().toISOString()
          },
          notes: `Session auto-paused by AI: ${reason}`
        }]);

      console.log('Session auto-paused by AI:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('Error auto-pausing session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create emergency flag for critical violations
   */
  static async createEmergencyFlag(recordingId, data) {
    try {
      // Update recording with emergency flag
      await supabase
        .from('call_recordings')
        .update({
          ai_alerted: true,
          monitor_flagged: true,
          emergency_flagged: true,
          monitor_notes: `AI Emergency Flag: Risk Score ${data.riskScore}`,
          flagged_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      console.log('Emergency flag created for recording:', recordingId);
      return { success: true };
    } catch (error) {
      console.error('Error creating emergency flag:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Flag session for review
   */
  static async flagSession(recordingId, data) {
    try {
      await supabase
        .from('call_recordings')
        .update({
          ai_alerted: true,
          monitor_notes: `AI Flag: Risk Score ${data.riskScore}`,
          flagged_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      return { success: true };
    } catch (error) {
      console.error('Error flagging session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log incident for audit trail
   */
  static async logIncident(recordingId, data) {
    try {
      await supabase
        .from('ai_incident_logs')
        .insert([{
          recording_id: recordingId,
          incident_type: 'ai_detection',
          risk_score: data.riskScore,
          violation_details: data,
          timestamp: new Date().toISOString()
        }]);

      return { success: true };
    } catch (error) {
      console.error('Error logging incident:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log escalation action
   */
  static async logEscalation(recordingId, escalationLevel, data) {
    try {
      await supabase
        .from('ai_escalation_logs')
        .insert([{
          recording_id: recordingId,
          escalation_level: escalationLevel,
          risk_score: data.riskScore,
          actions_taken: data.actions || [],
          escalation_data: data,
          timestamp: new Date().toISOString()
        }]);

      return { success: true };
    } catch (error) {
      console.error('Error logging escalation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to admins
   */
  static async sendAdminNotification(alertData) {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (error) throw error;

      // Send notification to each admin
      for (const admin of admins) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: admin.id,
            type: 'ai_alert',
            title: 'Critical AI Alert',
            message: `AI detected critical violation in call recording`,
            data: alertData,
            is_emergency: true,
            created_at: new Date().toISOString()
          }]);
      }

      // Send real-time channel notification
      await supabase
        .channel('admin_alerts')
        .send({
          type: 'broadcast',
          event: 'ai_alert',
          payload: alertData
        });

      return { success: true };
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to monitors
   */
  static async sendMonitorNotification(alertData) {
    try {
      // Get all monitor users
      const { data: monitors, error } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['monitor', 'admin']);

      if (error) throw error;

      // Send notification to each monitor
      for (const monitor of monitors) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: monitor.id,
            type: 'ai_alert',
            title: 'AI Monitoring Alert',
            message: `AI detected potential violation in call recording`,
            data: alertData,
            created_at: new Date().toISOString()
          }]);
      }

      // Send real-time channel notification
      await supabase
        .channel('monitor_alerts')
        .send({
          type: 'broadcast',
          event: 'ai_alert',
          payload: alertData
        });

      return { success: true };
    } catch (error) {
      console.error('Error sending monitor notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle emotional alert
   */
  static async handleEmotionalAlert(recordingId, emotions) {
    try {
      await this.triggerViolationAlert(recordingId, {
        type: 'emotional_distress',
        emotions: emotions,
        severity: emotions.distress > 0.8 ? 'critical' : 'high',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling emotional alert:', error);
    }
  }

  /**
   * Handle pattern alert
   */
  static async handlePatternAlert(recordingId, patterns) {
    try {
      await this.triggerViolationAlert(recordingId, {
        type: 'behavioral_pattern',
        patterns: patterns,
        severity: patterns.severity,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling pattern alert:', error);
    }
  }

  /**
   * Handle chat escalation
   */
  static async handleChatEscalation(messageData, analysis) {
    try {
      await this.createAIAlert({
        alert_type: 'chat_violation',
        severity: this.calculateAlertSeverity(analysis.riskScore),
        booking_id: messageData.booking_id,
        client_id: messageData.sender_id,
        reader_id: messageData.receiver_id,
        violation_details: {
          riskScore: analysis.riskScore,
          flags: analysis.flags,
          violations: analysis.violations,
          emotions: analysis.emotions,
          content: messageData.content,
          sessionTag: analysis.sessionTag
        },
        ai_confidence: Math.min(analysis.riskScore, 100)
      });
    } catch (error) {
      console.error('Error handling chat escalation:', error);
    }
  }

  /**
   * Determine session tag from risk score
   */
  static determineSessionTagFromScore(riskScore) {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'suspicious';
    if (riskScore >= 30) return 'needs_review';
    return 'safe';
  }

  /**
   * Process AI feedback for training
   */
  static async processAIFeedback(alertId, feedback, reviewerId) {
    try {
      // Update alert with human feedback
      await supabase
        .from('ai_monitoring_alerts')
        .update({
          human_feedback: feedback, // 'accurate' or 'false_positive'
          feedback_provided_by: reviewerId,
          feedback_provided_at: new Date().toISOString()
        })
        .eq('id', alertId);

      // Store feedback for AI training
      await supabase
        .from('ai_training_feedback')
        .insert([{
          alert_id: alertId,
          feedback_type: feedback,
          reviewer_id: reviewerId,
          timestamp: new Date().toISOString()
        }]);

      // Adjust AI sensitivity based on feedback patterns
      await this.adjustAISensitivity(feedback);

      return { success: true };
    } catch (error) {
      console.error('Error processing AI feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adjust AI sensitivity based on feedback
   */
  static async adjustAISensitivity(feedback) {
    try {
      // Get recent feedback statistics
      const { data: recentFeedback, error } = await supabase
        .from('ai_training_feedback')
        .select('feedback_type')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const totalFeedback = recentFeedback.length;
      const falsePositives = recentFeedback.filter(f => f.feedback_type === 'false_positive').length;
      const falsePositiveRate = totalFeedback > 0 ? falsePositives / totalFeedback : 0;

      // Adjust threshold based on false positive rate
      let newThreshold = this.monitoringSettings.ai_risk_threshold;
      
      if (falsePositiveRate > 0.3) { // Too many false positives
        newThreshold = Math.min(newThreshold + 5, 90);
      } else if (falsePositiveRate < 0.1) { // Very few false positives
        newThreshold = Math.max(newThreshold - 2, 50);
      }

      // Update threshold if changed
      if (newThreshold !== this.monitoringSettings.ai_risk_threshold) {
        await supabase
          .from('monitoring_settings')
          .update({ setting_value: newThreshold })
          .eq('setting_key', 'ai_risk_threshold');

        this.monitoringSettings.ai_risk_threshold = newThreshold;
        console.log('AI risk threshold adjusted to:', newThreshold);
      }

      return { success: true };
    } catch (error) {
      console.error('Error adjusting AI sensitivity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get comprehensive AI monitoring statistics
   */
  static async getEnhancedMonitoringStats() {
    try {
      const { data: alerts, error: alertsError } = await supabase
        .from('ai_monitoring_alerts')
        .select('severity, resolved, created_at, human_feedback');

      const { data: chatMonitoring, error: chatError } = await supabase
        .from('chat_monitoring')
        .select('ai_risk_score, ai_alerted, session_tag');

      const { data: callRecordings, error: callError } = await supabase
        .from('call_recordings')
        .select('ai_alerted, monitor_flagged, emergency_flagged');

      if (alertsError || chatError || callError) {
        throw alertsError || chatError || callError;
      }

      const stats = {
        totalAlerts: alerts.length,
        alertsBySeverity: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        },
        resolvedAlerts: alerts.filter(a => a.resolved).length,
        feedbackStats: {
          accurate: alerts.filter(a => a.human_feedback === 'accurate').length,
          falsePositives: alerts.filter(a => a.human_feedback === 'false_positive').length,
          pending: alerts.filter(a => !a.human_feedback).length
        },
        sessionTags: {
          safe: chatMonitoring.filter(c => c.session_tag === 'safe').length,
          needs_review: chatMonitoring.filter(c => c.session_tag === 'needs_review').length,
          suspicious: chatMonitoring.filter(c => c.session_tag === 'suspicious').length,
          critical: chatMonitoring.filter(c => c.session_tag === 'critical').length
        },
        callStats: {
          totalRecordings: callRecordings.length,
          aiAlerted: callRecordings.filter(r => r.ai_alerted).length,
          monitorFlagged: callRecordings.filter(r => r.monitor_flagged).length,
          emergencyFlagged: callRecordings.filter(r => r.emergency_flagged).length
        },
        activeMonitoringSessions: this.activeMonitoringSessions.size,
        chatMessagesAnalyzed: chatMonitoring.length,
        chatAlertsTriggered: chatMonitoring.filter(c => c.ai_alerted).length,
        averageRiskScore: chatMonitoring.length > 0 
          ? chatMonitoring.reduce((sum, c) => sum + c.ai_risk_score, 0) / chatMonitoring.length 
          : 0
      };

      return {
        success: true,
        data: stats,
        message: 'Enhanced AI monitoring statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching enhanced monitoring stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AIWatchdogService; 