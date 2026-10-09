import React, { useEffect, useState } from 'react';

/**
 * JarvisRobotAvatar.jsx
 * Replaced robot visual design matching the new reference image:
 * Friendly futuristic white-and-dark-metal robot with curved happy glowing cyan eyes,
 * glowing blue headphones, and chest arc reactor.
 * 100% clean transparent character with zero embedded text, buttons, or speech bubbles.
 */
export default function JarvisRobotAvatar({
  state = 'IDLE', // 'IDLE' | 'WAKE_WORD_DETECTED' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'STOPPED' | 'ERROR'
  size = 'md',
  className = '',
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (state !== 'SPEAKING' && state !== 'LISTENING') return;
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, 150);
    return () => clearInterval(interval);
  }, [state]);

  const dims = {
    sm: { w: 180, h: 250 },
    md: { w: 260, h: 360 },
    lg: { w: 320, h: 440 },
  }[size] || { w: 260, h: 360 };

  const isListening = state === 'LISTENING' || state === 'WAKE_WORD_DETECTED';
  const isSpeaking = state === 'SPEAKING';
  const isProcessing = state === 'PROCESSING';
  const isStopped = state === 'STOPPED';
  const isError = state === 'ERROR';

  const glowColor = isError
    ? 'rgba(244, 63, 94, 0.65)'
    : isProcessing
    ? 'rgba(168, 85, 247, 0.65)'
    : isSpeaking
    ? 'rgba(0, 229, 255, 0.8)'
    : isListening
    ? 'rgba(0, 195, 255, 0.7)'
    : 'rgba(0, 168, 255, 0.35)';

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width: dims.w, height: dims.h }}
    >
      <style>{`
        @keyframes floatNewRobot {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(0.4deg); }
        }
        @keyframes auraGlow {
          0%, 100% { opacity: 0.6; transform: scale(0.96); }
          50% { opacity: 0.95; transform: scale(1.04); }
        }
      `}</style>

      {/* Atmospheric Cyan Radial Glow behind Robot */}
      <div
        className="absolute inset-0 rounded-full blur-3xl pointer-events-none transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(2, 11, 23, 0) 72%)`,
          animation: isSpeaking || isListening ? 'auraGlow 1.8s infinite ease-in-out' : 'none',
        }}
      />

      {/* Main Animated Robot Character Container */}
      <div
        className="relative z-10 w-full h-full flex items-center justify-center transition-all duration-300"
        style={{
          animation: isStopped ? 'none' : 'floatNewRobot 4.5s ease-in-out infinite',
          transform: isListening ? 'scale(1.03)' : 'scale(1)',
        }}
      >
        <img
          src="/jarvis/campus_robot_avatar.png"
          alt="CampusInsight AI Robot Assistant"
          className="w-full h-full object-contain filter transition-all duration-300"
          style={{
            filter: `drop-shadow(0 0 25px ${glowColor})`,
          }}
          onError={(e) => {
            // Fallback to secondary asset if not cached
            e.currentTarget.src = '/jarvis/new_robot_avatar.png';
          }}
        />

        {/* Audio Reactive Voice Wavelet (Visible when Speaking) */}
        {isSpeaking && (
          <div className="absolute top-[42%] left-[45%] -translate-x-1/2 flex items-center gap-0.5 pointer-events-none opacity-90">
            <span className="w-1 h-3 rounded-full bg-cyan-300 animate-pulse" />
            <span className="w-1.5 h-6 rounded-full bg-cyan-200 animate-pulse" style={{ animationDelay: '100ms' }} />
            <span className="w-1 h-3 rounded-full bg-cyan-300 animate-pulse" style={{ animationDelay: '200ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}
