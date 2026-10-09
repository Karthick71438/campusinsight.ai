/**
 * JarvisVoiceService.js
 * High-reliability voice assistant engine for CampusInsight AI.
 *
 * Capabilities:
 * ─ Wake-word detection: "Hey Jarvis", "Hey Chat", phonetic variants (Hey Davis, Hey Travis)
 * ─ Hardware echo cancellation (speechEndTime guard)
 * ─ Rich student data queries (attendance, assessment, CGPA, subjects, decay, recommendations)
 * ─ Intelligent analysis with reasons, not just raw numbers
 * ─ Full navigation: dashboard, quiz, profile, graph, decay, roadmap, brain-blast, faculty, help
 * ─ AI fallback via /ai/chat for questions not covered by local logic
 * ─ Strict regex intent matching — no accidental navigation from ambient audio
 */

import { STUDENT_PROFILES } from '../../data/studentProfiles';
import { api } from '../../services/api';

// ─── Wake phrase regex covering "Hey Jarvis", "Hey Chat", and phonetic variations
const WAKE_WORD_PATTERN =
  /\b(hey\s+jarvis|hi\s+jarvis|jarvis|hey\s+jervis|jervis|hey\s+charvis|charvis|hey\s+chat|hi\s+chat|chat|hey\s+davis|davis|hey\s+travis|travis|hey\s+service|service|hey\s+javis|javis|hey\s+chad)\b/i;

// ─── Helper: find the active student profile ────────────────────────────────
function getStudentProfile(contextStudentId) {
  const id =
    contextStudentId ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('learnGraph_student_id')) ||
    'student-demo-1';

  return STUDENT_PROFILES.find((p) => p.id === id) || STUDENT_PROFILES[0];
}

// ─── Helper: trend direction text ───────────────────────────────────────────
function trendDirection(trend, field) {
  if (!trend || trend.length < 2) return 'stable';
  const first = trend[0][field];
  const last = trend[trend.length - 1][field];
  const diff = last - first;
  if (diff > 3) return 'improving';
  if (diff < -3) return 'declining';
  return 'stable';
}

// ─── Helper: find weakest subject ───────────────────────────────────────────
function weakestSubject(subjectPerformance) {
  if (!subjectPerformance || subjectPerformance.length === 0) return null;
  return subjectPerformance.reduce((a, b) =>
    a.internal_marks < b.internal_marks ? a : b
  );
}

// ─── Helper: find strongest subject ─────────────────────────────────────────
function strongestSubject(subjectPerformance) {
  if (!subjectPerformance || subjectPerformance.length === 0) return null;
  return subjectPerformance.reduce((a, b) =>
    a.internal_marks > b.internal_marks ? a : b
  );
}

// ─── Helper: strip markdown from AI response before speaking ────────────────
function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, (m) => m.replace(/`/g, ''))
    .replace(/[*#_~>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

class JarvisVoiceService {
  constructor() {
    this.recognition = null;
    this.audioCtx = null;
    this.isListening = false;
    this.isEngineRunning = false;
    this.engineStatus = 'IDLE'; // 'IDLE' | 'STARTED' | 'DENIED' | 'UNSUPPORTED'
    this.isSpeaking = false;
    this.speechEndTime = 0;
    this.isMuted = false;
    this.currentState = 'IDLE';

    this.onStateChange = null;
    this.onTranscript = null;
    this.onResponse = null;
    this.onError = null;
    this.onWakeWord = null;

    this.selectedVoice = null;
    this.restartTimeout = null;
    this.lastProcessedText = '';
    this.lastProcessedTime = 0;
    this.currentContext = {};

    // When false → engine is running but ONLY listens for the wake phrase.
    // When true  → overlay is open; full intent processing is enabled.
    this.isSessionActive = false;

    this.initAudioContext();
    this.initVoices();
    this.initRecognition();
  }

  setContext(ctx) {
    this.currentContext = { ...this.currentContext, ...ctx };
  }

  setState(newState) {
    this.currentState = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  /**
   * Call this when the overlay OPENS — enables full intent processing.
   */
  startSession() {
    this.isSessionActive = true;
    this.lastProcessedText = '';
    this.lastProcessedTime = 0;
  }

  /**
   * Call this when the overlay CLOSES — reverts to wake-word-only mode.
   * Stops any in-progress speech immediately.
   */
  endSession() {
    this.isSessionActive = false;
    this.stopSpeaking();
    this.speechEndTime = Date.now() + 400; // 400ms echo cooldown
    this.lastProcessedText = '';
    this.lastProcessedTime = 0;
  }

  // ─── AudioContext ──────────────────────────────────────────────────────────
  initAudioContext() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.audioCtx = new AC();
    } catch (e) {
      console.warn('[Jarvis] AudioContext not available:', e);
    }
  }

  ensureAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  playChime(type = 'activate') {
    if (this.isMuted) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'activate') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.24);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'confirm') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('[Jarvis] Chime error:', e);
    }
  }

  // ─── Voices ────────────────────────────────────────────────────────────────
  initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const selectBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      this.selectedVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google UK English') ||
              v.name.includes('Google US English') ||
              v.name.includes('Daniel') ||
              v.name.includes('Samantha') ||
              v.name.includes('David') ||
              v.name.includes('George'))
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    };
    selectBestVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectBestVoice;
    }
  }

  // ─── Speech Recognition ────────────────────────────────────────────────────
  initRecognition() {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.engineStatus = 'UNSUPPORTED';
      console.warn('[Jarvis] Web Speech Recognition not supported.');
      return;
    }
    try {
      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        if (!this.isSpeaking && this.currentState !== 'PROCESSING') {
          this.setState('LISTENING');
        }
      };

      this.recognition.onresult = (event) => {
        if (this.isSpeaking || Date.now() - this.speechEndTime < 350) return;

        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) finalTranscript += text;
          else interimTranscript += text;
        }

        const rawText = (finalTranscript || interimTranscript).trim();
        if (!rawText) return;

        const cleanDisplayText = rawText
          .replace(/\b(hey\s+chad|a\s+chat)\b/gi, 'Hey Chat')
          .replace(/\b(hey\s+davis|hey\s+travis)\b/gi, 'Hey Jarvis');

        if (this.onTranscript) this.onTranscript(cleanDisplayText, Boolean(finalTranscript));

        // ── 1. FAST WAKE-WORD DETECTION (fires on interim — zero delay!) ───────
        if (!this.isSessionActive) {
          if (WAKE_WORD_PATTERN.test(cleanDisplayText)) {
            this.handleSpeechInput(cleanDisplayText);
          }
          return;
        }

        // ── 2. INSTANT ACTIONS WHEN SESSION IS ACTIVE (Navigation / Stop) ─────
        if (!finalTranscript.trim() && interimTranscript.trim()) {
          const lower = cleanDisplayText.toLowerCase();
          const isInstantCmd =
            /\b(open|go\s+to|show|take\s+me\s+to|navigate\s+to|start|launch)\s+(the\s+)?(dashboard|quiz|profile|graph|knowledge\s+graph|decay|decay\s+tracker|dk\s+analyzer|roadmap|adaptive\s+roadmap|learning\s+path|road\s+map|brain\s+blast|faculty|faculty\s+dashboard|help|support)\b/i.test(lower) ||
            /\b(stop|close|exit|dismiss|cancel)\b/i.test(lower);

          if (isInstantCmd) {
            this.handleSpeechInput(cleanDisplayText);
            return;
          }
        }

        // ── 3. STANDARD SPEECH INPUT (processed when finalized) ───────────────
        if (finalTranscript.trim()) {
          this.handleSpeechInput(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        console.warn('[Jarvis] Recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isEngineRunning = false;
          this.engineStatus = 'DENIED';
          this.setState('ERROR');
          if (this.onError) this.onError('Microphone access denied.');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.isEngineRunning && !this.isSpeaking && this.currentState !== 'STOPPED') {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => this.safeStartRecognition(), 80);
        } else if (!this.isEngineRunning) {
          this.setState('IDLE');
        }
      };
    } catch (e) {
      console.warn('[Jarvis] Recognition init error:', e);
      this.engineStatus = 'UNSUPPORTED';
    }
  }

  safeStartRecognition() {
    if (
      !this.recognition ||
      this.isListening ||
      !this.isEngineRunning ||
      this.isSpeaking ||
      this.currentState === 'STOPPED'
    )
      return;
    try {
      this.recognition.start();
    } catch (_) {}
  }

  isSupported() {
    return Boolean(
      typeof window !== 'undefined' &&
        (window.SpeechRecognition || window.webkitSpeechRecognition) &&
        window.speechSynthesis
    );
  }

  async startEngine() {
    this.ensureAudioContext();
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err) {
      this.isEngineRunning = false;
      this.engineStatus = 'DENIED';
      this.setState('ERROR');
      if (this.onError)
        this.onError('Microphone access is required for voice activation.');
      return false;
    }

    this.isEngineRunning = true;
    this.engineStatus = 'STARTED';
    this.playChime('activate');
    this.safeStartRecognition();
    this.setState('LISTENING');
    return true;
  }

  stopEngine() {
    this.isEngineRunning = false;
    this.engineStatus = 'IDLE';
    clearTimeout(this.restartTimeout);
    this.stopSpeaking();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
    this.setState('STOPPED');
  }

  speak(text, onComplete = null) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onComplete) onComplete();
      return;
    }
    if (this.isMuted) {
      if (onComplete) onComplete();
      return;
    }

    this.stopSpeaking();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }

    const cleanSpeech = text
      .replace(/[*#_~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech) {
      if (onComplete) onComplete();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.rate = 1.15;  // slightly faster speech
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.setState('SPEAKING');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.speechEndTime = Date.now();
      this.setState('LISTENING');
      if (this.isEngineRunning && this.currentState !== 'STOPPED') {
        setTimeout(() => this.safeStartRecognition(), 150); // was 400ms
      }
      if (onComplete) onComplete();
    };

    utterance.onerror = (err) => {
      console.warn('[Jarvis] Speech error:', err);
      this.isSpeaking = false;
      this.speechEndTime = Date.now();
      this.setState('LISTENING');
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.speechEndTime = Date.now();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopSpeaking();
    return this.isMuted;
  }

  getStudentFirstName() {
    const name =
      this.currentContext.displayName ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('learnGraph_display_name')) ||
      '';
    if (name) return name.split(' ')[0];
    // Fallback: look up from profile
    const profile = getStudentProfile(this.currentContext.activeStudentId);
    return profile?.name?.split(' ')[0] || 'there';
  }

  // ─── Turn-by-turn speech processor ────────────────────────────────────────
  async handleSpeechInput(rawQuery) {
    const query = rawQuery.trim();
    if (!query) return;

    if (this.isSpeaking || Date.now() - this.speechEndTime < 350) return;

    const now = Date.now();
    const lower = query.toLowerCase();
    if (lower === this.lastProcessedText && now - this.lastProcessedTime < 600) return;

    // ── Always check for wake word first ─────────────────────────────────────
    const hasWakeWord = WAKE_WORD_PATTERN.test(lower);
    const cleanedCommand = lower
      .replace(WAKE_WORD_PATTERN, '')
      .replace(/^[,\s.]+/, '')
      .trim();

    // ── SESSION GATE: When overlay is closed, ONLY wake words are processed ──
    // All other ambient speech (music, background, other people) is dropped.
    if (!this.isSessionActive) {
      if (!hasWakeWord) {
        return; // Silently ignore — overlay is closed
      }

      // Wake word heard → activate session and open overlay immediately!
      this.isSessionActive = true;
      this.lastProcessedText = lower;
      this.lastProcessedTime = now;

      this.setState('WAKE_WORD_DETECTED');
      this.playChime('activate');
      if (this.onWakeWord) this.onWakeWord(); // This opens the overlay in React!

      // If user said "Hey Jarvis open roadmap" in one breath:
      if (cleanedCommand) {
        this.setState('PROCESSING');
        const result = await this.resolveIntent(cleanedCommand);
        if (this.onResponse) this.onResponse(result);
        if (result.speech) {
          if (result.immediateAction && typeof result.immediateAction === 'function') {
            this.speak(result.speech);
            result.immediateAction();
          } else {
            this.speak(result.speech, () => {
              if (result.action && typeof result.action === 'function') result.action();
            });
          }
        } else if (result.immediateAction) {
          result.immediateAction();
        } else if (result.action) {
          result.action();
        }
        return;
      }

      // If ONLY the wake phrase was spoken ("Hey Jarvis"):
      const firstName = this.getStudentFirstName();
      const greetingSpoken = firstName
        ? `Hello ${firstName}! I'm listening. How can I help you today?`
        : "Hello! I'm listening. How can I help you today?";
      const greetingDisplay = firstName
        ? `Hello ${firstName}! 👋\nI'm listening. How can I help you?`
        : "Hello! 👋\nI'm listening. How can I help you?";

      if (this.onResponse) this.onResponse({ speech: greetingSpoken, displayText: greetingDisplay });
      this.speak(greetingSpoken);
      return;
    }

    // ── FULL PROCESSING: Session is active (overlay is open) ─────────────────
    this.lastProcessedText = query;
    this.lastProcessedTime = now;

    // ── 0. Stop command ──────────────────────────────────────────────────────
    if (/^(stop|stop listening|stop talking|pause|cancel)$/i.test(lower)) {
      this.stopSpeaking();
      this.setState('STOPPED');
      if (this.onResponse) {
        this.onResponse({
          displayText: 'Assistant stopped. Tap the microphone or say "Hey Jarvis" to resume.',
        });
      }
      return;
    }

    // ── 1. Wake word spoken INSIDE open overlay — just acknowledge ───────────
    if (hasWakeWord && !cleanedCommand) {
      const firstName = this.getStudentFirstName();
      const ack = firstName ? `I'm here, ${firstName}! Go ahead.` : "I'm here! Go ahead.";
      if (this.onResponse) this.onResponse({ speech: ack, displayText: `👂 ${ack}` });
      this.speak(ack);
      return;
    }

    // ── 2. Resolve intent ────────────────────────────────────────────────────
    const activeQuery = cleanedCommand || lower;
    this.setState('PROCESSING');

    const result = await this.resolveIntent(activeQuery);

    if (this.onResponse) this.onResponse(result);

    if (result.speech) {
      // For navigation: fire action IMMEDIATELY (don't wait for speech to finish)
      if (result.immediateAction && typeof result.immediateAction === 'function') {
        this.speak(result.speech); // fire-and-forget speech
        result.immediateAction();  // navigate right away
      } else {
        this.speak(result.speech, () => {
          if (result.action && typeof result.action === 'function') result.action();
        });
      }
    } else if (result.action) {
      result.action();
    }
  }

  // ─── MASTER INTENT RESOLVER ────────────────────────────────────────────────
  async resolveIntent(query) {
    const q = query.toLowerCase().trim();
    const { onNavigate, onCloseOverlay } = this.currentContext;

    // Shared nav helper — action fires immediately when speech starts
    const navigate = (tab, speech, display) => ({
      speech,
      displayText: display || speech,
      immediateAction: () => {
        if (onNavigate) onNavigate(tab);
        if (onCloseOverlay) onCloseOverlay();
      },
    });

    // ── Basic greetings ──────────────────────────────────────────────────────
    if (/^(hello|hello jarvis|hello chat|hello there|hey there)$/i.test(q)) {
      return { speech: 'Hello! How can I help you today?', displayText: 'Hello! 👋 How can I help you today?' };
    }
    if (/^(hi|hi there|hi jarvis|hi chat|hey)$/i.test(q)) {
      return { speech: "Hi there! You can ask me about your performance, or tell me to open any section.", displayText: "Hi there! 👋 Ask me about your scores, or say 'open roadmap', 'open quiz', etc." };
    }
    if (/\b(how are you|how do you do|you good)\b/i.test(q)) {
      return { speech: "I'm fully operational and ready to help! What would you like to know?", displayText: "I'm fully operational! What can I help you with?" };
    }
    if (/\b(what can you do|what are your capabilities|help me|what do you know)\b/i.test(q)) {
      const caps = "I can navigate to any section, answer questions about your attendance, assessment scores, CGPA, subject performance, weak areas, and give you personalized study recommendations. Just ask!";
      return { speech: caps, displayText: caps };
    }

    // ════════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ════════════════════════════════════════════════════════════════════════

    // Dashboard
    if (
      /\b(open|go\s+to|show|take\s+me\s+to|navigate\s+to)\s+(the\s+)?dashboard\b/i.test(q) ||
      q === 'dashboard'
    ) {
      return navigate('dashboard', 'Opening your Dashboard.', 'Navigating to Dashboard...');
    }

    // Quiz
    if (
      /\b(open|go\s+to|take\s+me\s+to|start|launch)\s+(the\s+)?(quiz|test|assessment)\b/i.test(q) ||
      q === 'quiz' || q === 'test'
    ) {
      return navigate('quiz', 'Opening the Quiz section.', 'Navigating to Quiz...');
    }

    // Profile
    if (
      /\b(open|go\s+to|show|take\s+me\s+to)\s+(the\s+)?(profile|my\s+profile|student\s+profile)\b/i.test(q) ||
      q === 'profile'
    ) {
      return navigate('profile', 'Opening your Profile.', 'Navigating to Profile...');
    }

    // Knowledge Graph
    if (
      /\b(open|go\s+to|show|take\s+me\s+to)\s+(the\s+)?(knowledge\s+graph|graph|knowledge\s+craft)\b/i.test(q) ||
      q === 'graph' || q === 'knowledge graph'
    ) {
      return navigate('graph', 'Opening the Knowledge Graph.', 'Navigating to Knowledge Graph...');
    }

    // Decay Tracker / DK Analyzer
    if (
      /\b(open|go\s+to|show|take\s+me\s+to)\s+(the\s+)?(decay|decay\s+tracker|dk\s+analyzer|retention|forgetting\s+curve)\b/i.test(q) ||
      q === 'decay' || q === 'decay tracker' || q === 'dk analyzer'
    ) {
      return navigate('decay', 'Opening the Decay Tracker.', 'Navigating to Decay Tracker...');
    }

    // Roadmap — supports many voice variations
    if (
      /\b(open|go\s+to|show|take\s+me\s+to|navigate\s+to|launch)\s+(the\s+)?(roadmap|my\s+roadmap|learning\s+path|adaptive\s+roadmap|road\s+map|study\s+path)\b/i.test(q) ||
      q === 'roadmap' || q === 'road map' || q === 'learning path'
    ) {
      return navigate('roadmap', 'Opening your Adaptive Roadmap.', 'Navigating to Adaptive Roadmap...');
    }

    // Brain Blast — strict match only to prevent accidental activation
    if (
      /\b(open|go\s+to|launch|play|start)\s+(the\s+)?brain\s+blast\b/i.test(q) ||
      q === 'brain blast'
    ) {
      return navigate('brain-blast', 'Opening Brain Blast. Good luck!', 'Navigating to Brain Blast...');
    }

    // Faculty
    if (
      /\b(open|go\s+to|show|switch\s+to)\s+(the\s+)?(faculty|faculty\s+dashboard|mentor\s+view)\b/i.test(q) ||
      q === 'faculty'
    ) {
      return navigate('faculty', 'Switching to the Faculty Dashboard.', 'Navigating to Faculty Dashboard...');
    }

    // Help & Support
    if (
      /\b(open|go\s+to|show)\s+(the\s+)?(help|support|help\s+and\s+support|faq)\b/i.test(q) ||
      q === 'help' || q === 'support'
    ) {
      return navigate('help', 'Opening Help and Support.', 'Navigating to Help & Support...');
    }

    // Close assistant
    if (/\b(close|exit|dismiss|end|goodbye|bye)\b/i.test(q)) {
      return {
        speech: 'Goodbye!',
        displayText: 'Closing assistant... Goodbye! 👋',
        immediateAction: () => { if (onCloseOverlay) onCloseOverlay(); },
      };
    }

    // ════════════════════════════════════════════════════════════════════════
    // STUDENT DATA QUERIES
    // ════════════════════════════════════════════════════════════════════════

    const profile = getStudentProfile(this.currentContext.activeStudentId);
    const { stats, subjectPerformance, attendanceTrend, assessmentTrend, internalTrend,
            insights, improvements, summary, name } = profile;
    const firstName = name?.split(' ')[0] || 'you';

    // ── Attendance ───────────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?attendance|attendance\s+(percentage|score|rate|status)|how\s+(is|was)\s+my\s+attendance)\b/i.test(q) ||
      q === 'attendance' || q === 'my attendance'
    ) {
      const att = stats.attendance;
      const trend = trendDirection(attendanceTrend, 'attendance');
      const lowest = attendanceTrend?.reduce((a, b) => (a.attendance < b.attendance ? a : b));
      let speech = `${firstName}, your current attendance is ${att}%. The trend is ${trend}.`;

      if (att < 75) {
        speech += ` This is below the required 75% cutoff, which puts you at risk of being detained. The lowest point was in ${lowest?.month} at ${lowest?.attendance}%. You need to attend classes consistently to recover.`;
      } else if (att < 85) {
        speech += ` You're above the minimum but don't have much buffer. Try not to miss any more classes.`;
      } else {
        speech += ` Excellent! You're comfortably above the minimum requirement.`;
      }

      return { speech, displayText: `📊 Attendance: ${att}%\nTrend: ${trend}\n\n${speech}` };
    }

    // ── Assessment Score ─────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(assessment|exam|test)\s*(score|percentage|marks?|result)|assessment\s+(score|percentage|marks?)|how\s+(did|am)\s+i\s+do\s+in\s+(assessment|exam))\b/i.test(q) ||
      q === 'assessment' || q === 'assessment score' || q === 'my assessment'
    ) {
      const score = stats.assessmentScore;
      const trend = trendDirection(assessmentTrend, 'assessment');
      const lowest = assessmentTrend?.reduce((a, b) => (a.assessment < b.assessment ? a : b));
      let speech = `${firstName}, your assessment score is ${score}%. The trend shows it is ${trend}.`;

      if (score < 50) {
        speech += ` This is critically low. The weakest month was ${lowest?.month} at ${lowest?.assessment}. You need to focus on revision and attempt more practice tests urgently.`;
      } else if (score < 70) {
        speech += ` There's meaningful room for improvement. Your weakest point was ${lowest?.month}. Focus on your weaker subjects to push this above 75.`;
      } else if (score < 85) {
        speech += ` You're in a good zone! A bit more effort on your weaker subjects will take you to the top tier.`;
      } else {
        speech += ` Outstanding performance! Keep up the excellent work.`;
      }

      return { speech, displayText: `📝 Assessment: ${score}%\nTrend: ${trend}\n\n${speech}` };
    }

    // ── Internal Marks ───────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(internal|internal\s+marks?)|internal\s+marks?\s*(score|percentage)?|how\s+(are|were)\s+my\s+internals)\b/i.test(q) ||
      q === 'internal marks' || q === 'internals' || q === 'my internals'
    ) {
      const marks = stats.internalMarks;
      const trend = trendDirection(internalTrend, 'marks');
      const weak = weakestSubject(subjectPerformance);
      const strong = strongestSubject(subjectPerformance);
      let speech = `${firstName}, your overall internal marks average is ${marks}. The trend is ${trend}. `;

      if (weak) speech += `Your weakest subject is ${weak.subject} with ${weak.internal_marks} marks. `;
      if (strong) speech += `Your strongest is ${strong.subject} with ${strong.internal_marks} marks.`;

      if (marks < 50) {
        speech += ` This needs urgent attention. Focus on your core concepts before the next internal exam.`;
      } else if (marks < 70) {
        speech += ` With targeted revision on your weaker subjects, you can push this above 75.`;
      }

      return { speech, displayText: `📚 Internal Marks: ${marks}\nTrend: ${trend}\n\n${speech}` };
    }

    // ── CGPA ─────────────────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(cgpa|gpa|grade\s+point)|my\s+cgpa)\b/i.test(q) ||
      q === 'cgpa' || q === 'gpa'
    ) {
      const cgpa = stats.cgpa;
      let speech = `${firstName}, your current CGPA is ${cgpa}.`;

      if (cgpa >= 9) speech += ` That's excellent — top of the class!`;
      else if (cgpa >= 8) speech += ` That's a strong score. You're performing very well.`;
      else if (cgpa >= 7) speech += ` Decent performance. Push your weaker subjects to cross 8.`;
      else if (cgpa >= 6) speech += ` There's significant room for improvement. Focus on internal marks and attendance consistency.`;
      else speech += ` This is critically low. Speak to your mentor and get a structured recovery plan.`;

      return { speech, displayText: `🎓 CGPA: ${cgpa}\n\n${speech}` };
    }

    // ── Risk Level ───────────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(risk|risk\s+level|academic\s+risk)|am\s+i\s+at\s+risk)\b/i.test(q) ||
      q === 'risk' || q === 'risk level' || q === 'my risk'
    ) {
      const risk = stats.riskLevel;
      let speech = `${firstName}, your current academic risk level is ${risk}.`;

      if (risk === 'Critical') {
        speech += ` This is the highest risk category. Immediate action is needed — attend all classes, complete all assignments, and consult your mentor today.`;
      } else if (risk === 'High') {
        speech += ` You're flagged as high risk. Focus on attendance recovery and seek academic counseling before the next evaluation.`;
      } else if (risk === 'Moderate') {
        speech += ` You're in a moderate zone. Keep monitoring your attendance and scores to avoid sliding into high risk.`;
      } else {
        speech += ` You're in good standing. Keep up the consistent effort!`;
      }

      return { speech, displayText: `⚠️ Risk Level: ${risk}\n\n${speech}` };
    }

    // ── Weakest Subject ──────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(weakest|worst|lowest|struggling|difficult)\s+(subject|course|topic)|which\s+subject\s+(am\s+i\s+weak\s+in|do\s+i\s+struggle|is\s+my\s+weakest))\b/i.test(q) ||
      q === 'weak subject' || q === 'weakest subject' || q === 'worst subject'
    ) {
      const weak = weakestSubject(subjectPerformance);
      if (!weak) return { speech: "I don't have subject data for you yet. Complete a quiz first!", displayText: "No subject data yet. Complete a quiz to build your profile." };

      let speech = `${firstName}, your weakest subject is ${weak.subject} with ${weak.internal_marks} marks and ${weak.attendance}% attendance.`;
      speech += ` Low concentration in ${weak.subject} is often linked to insufficient practice sessions and lower class attendance. I recommend allocating extra revision time, solving past papers, and asking your faculty for clarification on foundational concepts.`;

      return { speech, displayText: `⚠️ Weakest: ${weak.subject} (${weak.internal_marks} marks)\n\n${speech}` };
    }

    // ── Strongest Subject ────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(strongest|best|highest|top)\s+(subject|course))\b/i.test(q) ||
      q === 'best subject' || q === 'strongest subject'
    ) {
      const strong = strongestSubject(subjectPerformance);
      if (!strong) return { speech: "No subject data yet. Complete a quiz to see your strengths.", displayText: "No subject data yet." };

      const speech = `${firstName}, your strongest subject is ${strong.subject} with ${strong.internal_marks} marks. Keep building on this strength!`;
      return { speech, displayText: `⭐ Best: ${strong.subject} (${strong.internal_marks} marks)\n\n${speech}` };
    }

    // ── All Subjects ─────────────────────────────────────────────────────────
    if (
      /\b(show|tell\s+me|list|what\s+are)\s+(my\s+)?(all\s+)?(subjects?|subject\s+performance|subject\s+scores?|subject\s+marks?)\b/i.test(q) ||
      q === 'subjects' || q === 'subject performance' || q === 'my subjects'
    ) {
      if (!subjectPerformance || subjectPerformance.length === 0) {
        return { speech: "No subject data found. Complete a quiz to populate your performance.", displayText: "No subject data yet." };
      }
      const list = subjectPerformance.map((s) => `${s.subject}: ${s.internal_marks}`).join(', ');
      const speech = `${firstName}, here are your subject scores — ${list}. ` +
        `Your weakest is ${weakestSubject(subjectPerformance)?.subject} and your strongest is ${strongestSubject(subjectPerformance)?.subject}.`;
      const display = subjectPerformance.map((s) => `• ${s.subject}: ${s.internal_marks} marks | ${s.attendance}% attendance`).join('\n');
      return { speech, displayText: `📋 Subject Performance:\n${display}` };
    }

    // ── Insights / AI Observations ───────────────────────────────────────────
    if (
      /\b(what\s+are\s+(my\s+)?(insights?|observations?|analysis)|give\s+me\s+(some\s+)?(insights?|analysis|feedback)|analyze\s+(my|me))\b/i.test(q) ||
      q === 'insights' || q === 'my insights' || q === 'observations'
    ) {
      if (!insights || insights.length === 0) {
        return { speech: "I don't have specific insights for you yet.", displayText: "No insights available yet." };
      }
      const speech = `Here are the key insights for ${firstName}: ${insights.join('. ')}`;
      const display = `💡 Insights:\n${insights.map((i) => `• ${i}`).join('\n')}`;
      return { speech, displayText: display };
    }

    // ── Improvements / Recommendations ───────────────────────────────────────
    if (
      /\b(what\s+should\s+i\s+(improve|focus\s+on|study|work\s+on)|give\s+me\s+(recommendations?|suggestions?|tips?)|how\s+can\s+i\s+(improve|do\s+better)|study\s+(recommendations?|plan|tips?)|what\s+to\s+study)\b/i.test(q) ||
      q === 'recommendations' || q === 'improvements' || q === 'study tips' || q === 'advice'
    ) {
      if (!improvements || improvements.length === 0) {
        return { speech: "No specific recommendations yet. Keep taking quizzes to build your profile!", displayText: "No recommendations yet. Keep quizzing!" };
      }
      const speech = `${firstName}, here's what you should focus on: ${improvements.join('. ')}`;
      const display = `🎯 Recommendations:\n${improvements.map((i) => `• ${i}`).join('\n')}`;
      return { speech, displayText: display };
    }

    // ── Summary / Overall Performance ────────────────────────────────────────
    if (
      /\b(how\s+(am\s+i\s+doing|is\s+my\s+performance)|overall\s+(performance|progress|summary)|give\s+me\s+(a\s+)?summary|my\s+summary|my\s+(overall\s+)?performance)\b/i.test(q) ||
      q === 'summary' || q === 'how am i doing' || q === 'performance'
    ) {
      const speechSummary = summary || `${firstName} has a CGPA of ${stats.cgpa}, attendance at ${stats.attendance}%, assessment score at ${stats.assessmentScore}%, and risk level is ${stats.riskLevel}.`;
      const speech = `Here's ${firstName}'s overall summary: ${speechSummary} Attendance is ${stats.attendance}%, CGPA is ${stats.cgpa}, risk level is ${stats.riskLevel}.`;
      const display = `📊 Performance Summary:\n• CGPA: ${stats.cgpa}\n• Attendance: ${stats.attendance}%\n• Assessment: ${stats.assessmentScore}%\n• Internals: ${stats.internalMarks}\n• Risk: ${stats.riskLevel}\n\n${speechSummary}`;
      return { speech, displayText: display };
    }

    // ── Assignment Score ─────────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(assignment|homework)\s*(score|marks?)|assignment\s+score)\b/i.test(q) ||
      q === 'assignment score' || q === 'assignments'
    ) {
      const aScore = stats.assignmentScore;
      let speech = `${firstName}, your assignment score is ${aScore}%.`;
      if (aScore < 60) speech += ' This is low. Make sure you submit all pending assignments on time.';
      else if (aScore < 75) speech += ' Try to improve this by submitting well-researched work.';
      else speech += ' Good job staying on top of your assignments!';
      return { speech, displayText: `📄 Assignment Score: ${aScore}%\n\n${speech}` };
    }

    // ── Compare subjects ─────────────────────────────────────────────────────
    if (
      /\b(compare|rank|order|sort)\s+(my\s+)?subjects?\b/i.test(q)
    ) {
      if (!subjectPerformance || subjectPerformance.length === 0) {
        return { speech: "No subject data to compare yet.", displayText: "No subject data yet." };
      }
      const sorted = [...subjectPerformance].sort((a, b) => b.internal_marks - a.internal_marks);
      const ranked = sorted.map((s, i) => `${i + 1}. ${s.subject}: ${s.internal_marks}`).join(', ');
      const speech = `${firstName}, here are your subjects ranked by internal marks: ${ranked}.`;
      const display = `📊 Subjects Ranked:\n${sorted.map((s, i) => `${i + 1}. ${s.subject}: ${s.internal_marks} marks`).join('\n')}`;
      return { speech, displayText: display };
    }

    // ── What subjects need focus ─────────────────────────────────────────────
    if (
      /\b(which\s+subjects?\s+(need|require|should\s+i)\s+(focus|attention|study|work)|focus\s+areas?|where\s+should\s+i\s+focus)\b/i.test(q)
    ) {
      const lowSubjects = (subjectPerformance || []).filter((s) => s.internal_marks < 70);
      if (lowSubjects.length === 0) {
        return { speech: `${firstName}, all your subjects look good! Keep maintaining the consistency.`, displayText: "All subjects performing well! 🎉" };
      }
      const list = lowSubjects.map((s) => `${s.subject} (${s.internal_marks})`).join(', ');
      const speech = `${firstName}, focus on these subjects that are below 70 marks: ${list}. Prioritize the weakest ones with targeted revision and practice.`;
      return { speech, displayText: `🎯 Focus Areas:\n${lowSubjects.map((s) => `• ${s.subject}: ${s.internal_marks} marks`).join('\n')}\n\nPrioritize these before exams!` };
    }

    // ─ Decay / Retention ─────────────────────────────────────────────────────
    if (
      /\b(what\s+(topics?|concepts?)\s+(are\s+)?(decaying|forgetting|fading|at\s+risk)|forgetting\s+curve|retention|knowledge\s+decay|dk\s+topics?)\b/i.test(q) ||
      q === 'decay' || q === 'decaying topics' || q === 'forgetting curve'
    ) {
      const decayData = this.currentContext.decayData;
      let speech, display;

      if (decayData && Array.isArray(decayData) && decayData.length > 0) {
        const atRisk = decayData.filter((t) => (t.retentionScore || t.retention_score || 100) < 65);
        if (atRisk.length > 0) {
          const names = atRisk.slice(0, 4).map((t) => t.conceptName || t.concept_name || t.name).join(', ');
          speech = `${firstName}, these topics are at risk of being forgotten: ${names}. Review them soon to maintain your knowledge retention.`;
          display = `⚡ Decaying Topics:\n${atRisk.slice(0, 6).map((t) => `• ${t.conceptName || t.concept_name || t.name}: ${Math.round(t.retentionScore || t.retention_score || 0)}%`).join('\n')}`;
        } else {
          speech = `${firstName}, great news! None of your topics are critically decaying. Keep reviewing regularly.`;
          display = '✅ All topics are well-retained!';
        }
      } else {
        speech = `${firstName}, open the Decay Tracker to see which topics need review. Topics that haven't been reviewed in a while will show low retention scores.`;
        display = 'Open Decay Tracker to see topic retention details.';
      }
      return { speech, displayText: display };
    }

    // ─ Roadmap / Learning Plan ────────────────────────────────────────────────
    if (
      /\b(what('?s|\s+is)\s+(my\s+)?(study\s+plan|learning\s+plan|roadmap)|tell\s+me\s+about\s+(my\s+)?roadmap)\b/i.test(q)
    ) {
      return navigate(
        'roadmap',
        `${firstName}, let me open your Adaptive Roadmap. It shows your personalized study path based on your quiz performance and topic mastery.`,
        'Opening Adaptive Roadmap — your personalized study path.'
      );
    }

    // ─ Quiz history ───────────────────────────────────────────────────────────
    if (
      /\b(quiz\s+(history|results?|performance|score)|how\s+(did|have)\s+i\s+done\s+(in|on)\s+(the\s+)?quiz|my\s+quiz\s+(results?|score))\b/i.test(q) ||
      q === 'quiz history' || q === 'quiz results'
    ) {
      try {
        const raw = typeof localStorage !== 'undefined' && localStorage.getItem('campusinsight_quiz_history');
        if (raw) {
          const history = JSON.parse(raw);
          if (Array.isArray(history) && history.length > 0) {
            const recent = history.slice(-3);
            const scoreText = recent.map((r) =>
              `${r.topicName || r.topic || 'Quiz'}: ${r.score ?? r.percentage ?? 'N/A'}%`
            ).join(', ');
            const speech = `${firstName}, your recent quiz results are: ${scoreText}. Head to the Quiz section for more details.`;
            return { speech, displayText: `📝 Recent Quiz Results:\n${recent.map((r) => `• ${r.topicName || r.topic || 'Quiz'}: ${r.score ?? r.percentage ?? 'N/A'}%`).join('\n')}` };
          }
        }
      } catch (_) {}
      return {
        speech: `${firstName}, I don't have quiz history yet. Take a quiz to track your progress!`,
        displayText: 'No quiz history found. Take a quiz to get started!',
      };
    }

    // ─ Mentor / Faculty info ──────────────────────────────────────────────────
    if (
      /\b(who\s+is\s+(my\s+)?(mentor|advisor|faculty)|mentor\s+(details?|info|name)|faculty\s+info)\b/i.test(q) ||
      q === 'my mentor' || q === 'mentor info'
    ) {
      const speech = "Your mentor is Dr. Arun Kumar, Associate Professor in Computer Science and Business Systems. You can view the Faculty Dashboard for more details.";
      return { speech, displayText: `👨‍🏫 Mentor: Dr. Arun Kumar\nAssociate Professor, CSBS\n\n${speech}` };
    }

    // ─ Student name / who am I ────────────────────────────────────────────────
    if (
      /\b(who\s+am\s+i|what('?s|\s+is)\s+my\s+name|my\s+roll\s+number|my\s+student\s+id|my\s+details)\b/i.test(q)
    ) {
      const speech = `You are ${profile.name}, Roll Number ${profile.rollNumber}, Year ${profile.year}, Section ${profile.section}. Your CGPA is ${stats.cgpa}.`;
      return { speech, displayText: `👤 Student: ${profile.name}\n• Roll: ${profile.rollNumber}\n• Year: ${profile.year} | Section: ${profile.section}\n• CGPA: ${stats.cgpa}` };
    }

    // ════════════════════════════════════════════════════════════════════════
    // AI FALLBACK — Ask the Gemini AI backend for anything else
    // ════════════════════════════════════════════════════════════════════════
    try {
      const activeStudentId = this.currentContext.activeStudentId || 'student-demo-1';
      const context = {
        student_name: profile.name,
        student_id: activeStudentId,
        attendance: stats.attendance,
        assessment_score: stats.assessmentScore,
        cgpa: stats.cgpa,
        risk_level: stats.riskLevel,
        weakest_subject: weakestSubject(subjectPerformance)?.subject || 'N/A',
      };

      const res = await api.sendDoubtMessage(
        `[CampusInsight Jarvis Voice Query from student ${profile.name}]: ${query}`,
        activeStudentId,
        null,
        [],
        context
      );

      const aiText =
        res?.response ||
        res?.message ||
        res?.answer ||
        (typeof res === 'string' ? res : null);

      if (aiText && aiText.trim()) {
        const cleanAI = stripMarkdown(aiText);
        // Safety: truncate to 400 chars for speech, keep full for display
        const speakText = cleanAI.length > 400 ? cleanAI.substring(0, 397) + '...' : cleanAI;
        return { speech: speakText, displayText: cleanAI };
      }
    } catch (aiErr) {
      console.warn('[Jarvis] AI fallback error:', aiErr);
    }

    // ─ Ultimate fallback ──────────────────────────────────────────────────────
    // IMPORTANT: Do NOT mention any page names here to prevent mic echo!
    return {
      speech: "I'm not sure about that. Try asking me about your scores, attendance, or say 'open roadmap' to navigate.",
      displayText:
        "I didn't catch that clearly. 🤔\n\nYou can ask:\n• \"What's my attendance?\"\n• \"What's my weakest subject?\"\n• \"Open roadmap\"\n• \"Give me recommendations\"",
    };
  }
}

export const jarvisVoiceService = new JarvisVoiceService();
export default jarvisVoiceService;
