import React, { useState, useRef } from 'react';
import { User, Bot, Mic, MicOff, Square, PhoneOff, X, Volume2, VolumeX } from 'lucide-react';
import JarvisRobotAvatar from './JarvisRobotAvatar';

/**
 * JarvisOverlay.jsx
 * Full-screen voice assistant overlay matching the new reference image:
 * - Robot character positioned on the left facing center.
 * - Central glowing microphone orb with flanking audio waveforms.
 * - Top-right status pill ("Listening... ||||||") and close button.
 * - Center-right chat card with distinct user and assistant speech bubbles.
 * - Bottom action controls: Mic, Mute, Stop, End.
 */
export default function JarvisOverlay({
  isOpen = false,
  onClose = () => {},
  voiceService,
  state = 'IDLE', // 'IDLE' | 'WAKE_WORD_DETECTED' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'STOPPED' | 'ERROR'
  transcript = '',
  response = null,
  isEngineRunning = false,
  onToggleEngine = () => {},
  activeStudentName = 'Karthick',
}) {
  const [isMuted, setIsMuted] = useState(false);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleToggleMute = () => {
    if (voiceService) {
      const muted = voiceService.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleStop = () => {
    if (voiceService) {
      voiceService.stopSpeaking();
      voiceService.setState('STOPPED');
    }
  };

  const handleMicClick = () => {
    if (state === 'SPEAKING') {
      voiceService?.stopSpeaking();
    } else if (state === 'LISTENING') {
      voiceService?.stopEngine();
    } else {
      voiceService?.startEngine();
    }
  };

  if (!isOpen) return null;

  const studentFirstName = activeStudentName?.split(' ')[0] || 'Karthick';

  const statusLabel = {
    IDLE: 'Standby',
    WAKE_WORD_DETECTED: 'Wake Word Detected',
    LISTENING: 'Listening...',
    PROCESSING: 'Processing...',
    SPEAKING: 'Speaking...',
    STOPPED: 'Stopped',
    ERROR: 'Notice',
  }[state] || 'Listening...';

  // Dialogue messages
  const userDisplayText = transcript.trim() || 'Hey Chat';
  const assistantDisplayText =
    response?.displayText ||
    `Hello ${studentFirstName}! 👋\nI'm your CampusInsight AI assistant.\nHow can I help you today?`;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-[#020b17]/88 text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none overflow-y-auto animate-fade-in">
      <style>{`
        @keyframes waveOscillate {
          0%, 100% { height: 6px; }
          50% { height: 24px; }
        }
        @keyframes orbMicPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(0,229,255,0.6); }
          50% { transform: scale(1.06); box-shadow: 0 0 45px rgba(0,229,255,0.9); }
        }
      `}</style>

      {/* ========================================================
          1. TOP BAR: Floating Status Pill (Right) & Close (X)
          ======================================================== */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {/* Subtle Branding */}
          <span className="text-[11px] font-mono tracking-wider text-cyan-400 font-bold uppercase">
            CampusInsight AI Assistant
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Top-Right Status Capsule Pill */}
          <div
            className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg"
            style={{
              backgroundColor: 'rgba(7, 23, 44, 0.85)',
              borderColor: 'rgba(0, 195, 255, 0.45)',
              boxShadow: '0 0 18px rgba(0, 168, 255, 0.25)',
            }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-cyan-200">
              {statusLabel}
            </span>

            {/* Mini Audio Frequency Waveform */}
            <div className="flex items-center gap-0.5 ml-2 h-4">
              {[8, 14, 20, 16, 24, 18, 12, 6].map((h, i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-full bg-cyan-400"
                  style={{
                    height: `${h * 0.7}px`,
                    animation: state === 'LISTENING' || state === 'SPEAKING' ? 'waveOscillate 0.9s infinite' : 'none',
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================
          2. MAIN STAGE:
          Left: Robot Avatar
          Center: Glowing Microphone Orb with Flanking Waveforms
          Right/Bottom: Chat Conversation Card & Action Buttons
          ======================================================== */}
      <div className="relative flex-1 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 my-auto">
        {/* LEFT: Futuristic Friendly Robot Avatar */}
        <div className="flex items-center justify-center shrink-0">
          <JarvisRobotAvatar state={state} size="lg" />
        </div>

        {/* CENTER: Central Glowing Microphone Orb with Flanking Waveforms */}
        <div className="flex flex-col items-center justify-center my-4 lg:my-0">
          <div className="flex items-center gap-3">
            {/* Left Flanking Frequency Wave */}
            <div className="hidden sm:flex items-center gap-1 h-12">
              {[6, 12, 18, 26, 34, 22, 14, 8].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-cyan-400"
                  style={{
                    height: `${h}px`,
                    boxShadow: '0 0 8px rgba(0, 229, 255, 0.7)',
                    animation: state === 'LISTENING' || state === 'SPEAKING' ? 'waveOscillate 1.1s infinite' : 'none',
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>

            {/* Central Glowing Circular Microphone Orb */}
            <div
              onClick={handleMicClick}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300"
              style={{
                background: 'radial-gradient(circle, rgba(0, 168, 255, 0.4) 0%, rgba(3, 11, 23, 0.95) 75%)',
                border: '2.5px solid #00e5ff',
                boxShadow: '0 0 35px rgba(0, 229, 255, 0.75), inset 0 0 20px rgba(0, 229, 255, 0.5)',
                animation: state === 'LISTENING' || state === 'SPEAKING' ? 'orbMicPulse 2.4s infinite' : 'none',
              }}
              title="Microphone Orb - Click to toggle"
            >
              <Mic className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
            </div>

            {/* Right Flanking Frequency Wave */}
            <div className="hidden sm:flex items-center gap-1 h-12">
              {[8, 14, 22, 34, 26, 18, 12, 6].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-cyan-400"
                  style={{
                    height: `${h}px`,
                    boxShadow: '0 0 8px rgba(0, 229, 255, 0.7)',
                    animation: state === 'LISTENING' || state === 'SPEAKING' ? 'waveOscillate 1.1s infinite' : 'none',
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT / BOTTOM: Chat Conversation Card & Action Buttons */}
        <div className="flex-1 max-w-lg w-full flex flex-col items-center gap-5">
          {/* Transparent Glass Chat Card */}
          <div
            className="w-full rounded-3xl p-5 border backdrop-blur-xl shadow-2xl flex flex-col gap-4 text-left"
            style={{
              backgroundColor: 'rgba(5, 18, 36, 0.88)',
              borderColor: 'rgba(0, 195, 255, 0.35)',
              boxShadow: '0 0 30px rgba(0, 168, 255, 0.2)',
            }}
          >
            {/* Top-Right Bubble: User Turn */}
            <div className="flex justify-end animate-fade-in">
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-right max-w-xs"
                style={{
                  backgroundColor: 'rgba(9, 28, 56, 0.95)',
                  borderColor: 'rgba(0, 195, 255, 0.45)',
                  boxShadow: '0 0 15px rgba(0, 168, 255, 0.2)',
                }}
              >
                <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-400/80 flex items-center justify-center text-cyan-300 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold text-slate-100">
                    {userDisplayText}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/70 mt-0.5">
                    {currentTime} ✓✓
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom-Left Bubble: Assistant Turn */}
            <div className="flex justify-start animate-fade-in">
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-2xl border text-left max-w-sm"
                style={{
                  backgroundColor: 'rgba(7, 23, 44, 0.95)',
                  borderColor: 'rgba(0, 229, 255, 0.4)',
                  boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)',
                }}
              >
                <div className="w-7 h-7 rounded-full bg-cyan-900/60 border border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex flex-col flex-1">
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium">
                    {assistantDisplayText}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[9px] font-mono text-slate-400">
                    <span>{currentTime}</span>
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Action Controls in a Row: Mic, Mute, Stop, End */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 pt-2">
            {/* 1. Mic Control */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleMicClick}
                className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 text-white"
                style={{
                  background: 'linear-gradient(135deg, #0099ff 0%, #0055ff 100%)',
                  border: '2px solid #00e5ff',
                  boxShadow: '0 0 22px rgba(0, 168, 255, 0.7)',
                }}
                title="Microphone"
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
              <span className="text-[10px] font-mono text-slate-300 font-semibold">Mic</span>
            </div>

            {/* 2. Mute Control */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleToggleMute}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-cyan-300'
                }`}
                title={isMuted ? 'Unmute voice' : 'Mute voice'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <span className="text-[10px] font-mono text-slate-400">Mute</span>
            </div>

            {/* 3. Stop Control */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleStop}
                className="w-12 h-12 rounded-full border border-slate-700/80 bg-slate-900/80 hover:border-amber-400 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Stop speaking and listening"
              >
                <Square className="w-4 h-4 fill-slate-300" />
              </button>
              <span className="text-[10px] font-mono text-slate-400">Stop</span>
            </div>

            {/* 4. End Call / Close Control */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 text-white"
                style={{
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  border: '2px solid #fb7185',
                  boxShadow: '0 0 20px rgba(225, 29, 72, 0.6)',
                }}
                title="End Assistant"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
              <span className="text-[10px] font-mono text-rose-300 font-semibold">End</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
