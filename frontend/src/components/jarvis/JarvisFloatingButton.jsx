import React from 'react';
import { Radio, AlertCircle } from 'lucide-react';

/**
 * JarvisFloatingButton.jsx
 * Floating bottom-left button matching the new reference image:
 * Glowing cyan circular button containing the new robot head,
 * and attached dark pill with pulsing green indicator and "ENGINE STARTED".
 */
export default function JarvisFloatingButton({
  isEngineRunning = false,
  isListening = false,
  engineStatus = 'IDLE', // 'IDLE' | 'STARTED' | 'DENIED' | 'UNSUPPORTED'
  onClick = () => {},
  onToggleEngine = () => {},
  isOverlayOpen = false,
}) {
  if (isOverlayOpen) return null;

  const isActuallyStarted = isEngineRunning && engineStatus === 'STARTED';
  const isDenied = engineStatus === 'DENIED';

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 select-none group animate-fade-in">
      {/* 1. Circular Robot Head Button */}
      <button
        onClick={onClick}
        className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer p-0.5 overflow-hidden"
        style={{
          background: 'radial-gradient(circle, rgba(14,165,233,0.35) 0%, rgba(3,11,23,0.95) 75%)',
          boxShadow: isActuallyStarted
            ? '0 0 25px rgba(0, 229, 255, 0.75), inset 0 0 15px rgba(0, 229, 255, 0.35)'
            : '0 0 15px rgba(0, 168, 255, 0.35)',
          border: '2px solid rgba(0, 229, 255, 0.85)',
        }}
        title="Activate Voice Assistant (Or say 'Hey Chat')"
      >
        {isActuallyStarted && (
          <span
            className="absolute -inset-1 rounded-full animate-ping opacity-35 pointer-events-none"
            style={{ border: '2px solid #00e5ff' }}
          />
        )}

        {/* New Robot Head Image */}
        <img
          src="/jarvis/campus_head_avatar.png"
          alt="Chat Assistant"
          className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </button>

      {/* 2. Attached Pill Capsule: "ENGINE STARTED" */}
      <button
        onClick={isActuallyStarted ? onClick : onToggleEngine}
        className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 backdrop-blur-md shadow-lg"
        style={{
          backgroundColor: 'rgba(3, 14, 28, 0.92)',
          borderColor: isActuallyStarted
            ? 'rgba(0, 229, 255, 0.7)'
            : isDenied
            ? 'rgba(244, 63, 94, 0.7)'
            : 'rgba(71, 85, 105, 0.6)',
          boxShadow: isActuallyStarted
            ? '0 0 18px rgba(0, 229, 255, 0.3), inset 0 0 8px rgba(0, 229, 255, 0.15)'
            : 'none',
        }}
        title={isActuallyStarted ? 'Voice engine active - say "Hey Chat" anytime' : 'Click to enable voice activation'}
      >
        {isDenied ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-rose-300">
              MIC BLOCKED
            </span>
          </>
        ) : isActuallyStarted ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
            <span className="text-[11px] font-mono font-black tracking-wider uppercase text-cyan-300">
              ENGINE STARTED
            </span>
          </>
        ) : (
          <>
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300 group-hover:text-cyan-300">
              ENABLE VOICE ACTIVATION
            </span>
          </>
        )}
      </button>
    </div>
  );
}
