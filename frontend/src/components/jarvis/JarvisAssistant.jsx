import React, { useState, useEffect, useCallback, useRef } from 'react';
import jarvisVoiceService from './JarvisVoiceService';
import JarvisFloatingButton from './JarvisFloatingButton';
import JarvisOverlay from './JarvisOverlay';

/**
 * JarvisAssistant.jsx
 *
 * Mic lifecycle:
 * ─ On page load: engine auto-starts in WAKE-WORD-ONLY mode (session inactive).
 *   Only "Hey Jarvis" / "Hey Chat" can trigger anything. All other speech is
 *   silently dropped by the session gate. Friends talking → ignored.
 * ─ Overlay opens (button click or wake word) → startSession → full processing.
 * ─ Overlay closes (navigation, X, Escape, "close") → endSession immediately,
 *   then engine restarts after a 2s cooldown (so assistant's own voice echo
 *   doesn't accidentally re-trigger the wake phrase).
 */
export default function JarvisAssistant({
  activeTab,
  setActiveTab,
  activeStudentId,
  displayName,
  masteryOverview,
  decayData,
  recommendationsData,
  inspectedConcept,
}) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [engineStatus, setEngineStatus] = useState('IDLE');
  const [voiceState, setVoiceState] = useState('IDLE');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(null);

  const rearmTimerRef = useRef(null);

  // ── Keep context fresh ───────────────────────────────────────────────────
  useEffect(() => {
    jarvisVoiceService.setContext({
      activeTab,
      onNavigate: (tab) => setActiveTab(tab),
      activeStudentId,
      displayName,
      masteryOverview,
      decayData,
      recommendationsData,
      inspectedConcept,
      onCloseOverlay: () => {
        // Called after voice navigation — close overlay and re-arm wake-word
        setIsOverlayOpen(false);
        rearmAfterClose();
      },
    });
  }, [
    activeTab,
    setActiveTab,
    activeStudentId,
    displayName,
    masteryOverview,
    decayData,
    recommendationsData,
    inspectedConcept,
  ]);

  // ── Wire up service callbacks ─────────────────────────────────────────────
  useEffect(() => {
    jarvisVoiceService.onStateChange = (state) => {
      setVoiceState(state);
      setIsEngineRunning(jarvisVoiceService.isEngineRunning);
      setEngineStatus(jarvisVoiceService.engineStatus);
    };

    jarvisVoiceService.onTranscript = (text) => setTranscript(text);

    jarvisVoiceService.onWakeWord = () => {
      setIsOverlayOpen(true);
      jarvisVoiceService.startSession(); // enable full intent processing
    };

    jarvisVoiceService.onResponse = (res) => setResponse(res);

    jarvisVoiceService.onError = () => {
      setVoiceState('ERROR');
      setEngineStatus(jarvisVoiceService.engineStatus);
    };

    return () => {
      jarvisVoiceService.onStateChange = null;
      jarvisVoiceService.onTranscript = null;
      jarvisVoiceService.onWakeWord = null;
      jarvisVoiceService.onResponse = null;
      jarvisVoiceService.onError = null;
    };
  }, []);

  // ── AUTO-START: engine starts in wake-word-only mode on page load ─────────
  // Session is inactive → only "Hey Jarvis" passes through; all other speech
  // (music, friends, TV) is silently dropped by the session gate.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!jarvisVoiceService.isEngineRunning && jarvisVoiceService.isSupported()) {
        jarvisVoiceService.startEngine().then((ok) => {
          if (ok) {
            // Keep session INACTIVE — wake-word-only mode
            setIsEngineRunning(true);
            setEngineStatus('STARTED');
            setVoiceState('LISTENING');
          }
        }).catch(() => {});
      }
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  // ── Escape key closes overlay ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOverlayOpen) closeOverlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOverlayOpen]);

  // ── Re-arm: end session → revert to wake-word mode with zero dead-time ────
  const rearmAfterClose = useCallback(() => {
    // End active session — keeps engine running in wake-word-only mode!
    jarvisVoiceService.endSession();
    setTranscript('');
    if (!jarvisVoiceService.isEngineRunning && jarvisVoiceService.isSupported()) {
      jarvisVoiceService.startEngine().then((ok) => {
        if (ok) {
          setIsEngineRunning(true);
          setEngineStatus('STARTED');
          setVoiceState('LISTENING');
        }
      }).catch(() => {});
    }
  }, []);

  // ── Close overlay (manual) ────────────────────────────────────────────────
  const closeOverlay = useCallback(() => {
    setIsOverlayOpen(false);
    rearmAfterClose();
  }, [rearmAfterClose]);

  // ── Open overlay (button click) ───────────────────────────────────────────
  const handleOpenOverlay = useCallback(async () => {
    clearTimeout(rearmTimerRef.current);
    setIsOverlayOpen(true);
    setResponse(null);
    setTranscript('');

    if (!jarvisVoiceService.isEngineRunning) {
      const ok = await jarvisVoiceService.startEngine();
      setIsEngineRunning(jarvisVoiceService.isEngineRunning);
      setEngineStatus(jarvisVoiceService.engineStatus);
      if (ok) setVoiceState('LISTENING');
    }
    jarvisVoiceService.startSession(); // full processing mode
  }, []);

  // ── Manual mic toggle inside overlay ─────────────────────────────────────
  const handleToggleEngine = useCallback(async () => {
    if (jarvisVoiceService.isEngineRunning) {
      jarvisVoiceService.stopEngine();
      jarvisVoiceService.endSession();
      setIsEngineRunning(false);
      setEngineStatus('IDLE');
      setVoiceState('IDLE');
    } else {
      const ok = await jarvisVoiceService.startEngine();
      setIsEngineRunning(jarvisVoiceService.isEngineRunning);
      setEngineStatus(jarvisVoiceService.engineStatus);
      if (ok) {
        setVoiceState('LISTENING');
        jarvisVoiceService.startSession();
      }
    }
  }, []);

  return (
    <>
      {/* Floating Bottom-Left Jarvis Button */}
      <JarvisFloatingButton
        isEngineRunning={isEngineRunning}
        engineStatus={engineStatus}
        isListening={voiceState === 'LISTENING'}
        onClick={handleOpenOverlay}
        onToggleEngine={handleToggleEngine}
        isOverlayOpen={isOverlayOpen}
      />

      {/* Full-Screen Voice Interface */}
      <JarvisOverlay
        isOpen={isOverlayOpen}
        onClose={closeOverlay}
        voiceService={jarvisVoiceService}
        state={voiceState}
        transcript={transcript}
        response={response}
        isEngineRunning={isEngineRunning}
        onToggleEngine={handleToggleEngine}
        activeStudentName={displayName || 'Student'}
      />
    </>
  );
}
