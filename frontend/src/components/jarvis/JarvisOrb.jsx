import React, { useEffect, useState } from 'react';

/**
 * JarvisOrb.jsx
 * Faithful implementation of the central glowing holographic portal orb
 * from the reference image:
 * Concentric glowing neon blue rings, inner vertical equalizer bars,
 * status indicator, and wide horizontal audio frequency waveform.
 */
export default function JarvisOrb({
  state = 'idle', // 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
  statusText = 'Listening...',
  onClick = null,
  size = 190,
}) {
  // Inner vertical equalizer bars
  const [innerBars, setInnerBars] = useState([18, 32, 48, 64, 48, 32, 18]);
  // Wide horizontal waveform bars
  const [waveBars, setWaveBars] = useState([
    4, 8, 12, 18, 26, 36, 44, 52, 60, 48, 38, 28, 20, 14, 8, 4,
    6, 12, 22, 34, 48, 58, 66, 54, 42, 30, 20, 12, 6, 4
  ]);

  useEffect(() => {
    if (state !== 'listening' && state !== 'speaking') return;
    const interval = setInterval(() => {
      // Animate inner bars
      setInnerBars([
        Math.floor(14 + Math.random() * 22),
        Math.floor(22 + Math.random() * 32),
        Math.floor(35 + Math.random() * 40),
        Math.floor(45 + Math.random() * 45),
        Math.floor(35 + Math.random() * 40),
        Math.floor(22 + Math.random() * 32),
        Math.floor(14 + Math.random() * 22),
      ]);

      // Animate wide wave bars with gentle ripples
      setWaveBars((prev) =>
        prev.map((val) => {
          const delta = (Math.random() - 0.5) * 16;
          return Math.max(4, Math.min(68, Math.round(val + delta)));
        })
      );
    }, 110);
    return () => clearInterval(interval);
  }, [state]);

  const activeColor =
    state === 'speaking'
      ? '#2dd4bf'
      : state === 'processing'
      ? '#818cf8'
      : state === 'error'
      ? '#f43f5e'
      : '#00a8ff';

  const glowShadow =
    state === 'speaking'
      ? '0 0 50px rgba(45,212,191,0.7), inset 0 0 25px rgba(45,212,191,0.5)'
      : '0 0 55px rgba(0,168,255,0.75), inset 0 0 25px rgba(0,168,255,0.45)';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <style>{`
        @keyframes portalPulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        @keyframes ringSpinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* 1. Concentric Holographic Portal Orb */}
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className="relative flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95"
        style={{
          width: size,
          height: size,
          animation: 'portalPulse 3s ease-in-out infinite',
        }}
        title="Voice Portal - Click to toggle"
      >
        {/* Outermost Thin Cyan Glow Ring */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: '1.5px solid rgba(0, 168, 255, 0.4)',
            boxShadow: '0 0 40px rgba(0, 168, 255, 0.5)',
          }}
        />

        {/* Outer Ring with Tick Accents */}
        <div
          className="absolute inset-2 rounded-full pointer-events-none"
          style={{
            border: '2px solid rgba(0, 200, 255, 0.75)',
            boxShadow: glowShadow,
          }}
        />

        {/* Middle Glowing Portal Ring */}
        <div
          className="absolute inset-5 rounded-full pointer-events-none"
          style={{
            border: '2.5px solid #00c3ff',
            background: 'radial-gradient(circle, rgba(0, 80, 160, 0.3) 0%, rgba(2, 8, 20, 0.95) 75%)',
          }}
        />

        {/* Inner Dark Glass Disc with Vertical Equalizer Bars */}
        <div
          className="relative z-10 rounded-full flex items-center justify-center gap-1.5 px-4"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            background: 'radial-gradient(circle at 40% 40%, rgba(0, 140, 255, 0.25) 0%, #030a17 80%)',
            border: '1.5px solid rgba(56, 189, 248, 0.8)',
            boxShadow: 'inset 0 0 20px rgba(0, 168, 255, 0.6)',
          }}
        >
          {innerBars.map((height, idx) => (
            <span
              key={idx}
              className="w-1.5 rounded-full transition-all duration-100"
              style={{
                height: `${Math.max(6, (height / 80) * (size * 0.42))}px`,
                backgroundColor: '#ffffff',
                boxShadow: '0 0 10px #38bdf8, 0 0 20px #00a8ff',
              }}
            />
          ))}
        </div>
      </div>

      {/* 2. Status Label with Cyan Ring Icon */}
      <div className="mt-6 flex items-center gap-2.5">
        <span className="relative flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-cyan-400 bg-transparent flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </span>
        </span>
        <span className="text-sm font-semibold tracking-wide text-cyan-200">
          {statusText}
        </span>
      </div>

      {/* 3. Wide Horizontal Audio Waveform */}
      <div className="mt-4 flex items-center justify-center gap-1 w-full max-w-lg px-4 h-12">
        {waveBars.map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-full transition-all duration-100"
            style={{
              height: `${Math.max(4, h * 0.55)}px`,
              backgroundColor: '#00c3ff',
              boxShadow: '0 0 8px rgba(0, 195, 255, 0.7)',
              opacity: i < 3 || i > waveBars.length - 4 ? 0.4 : 0.9,
            }}
          />
        ))}
      </div>
    </div>
  );
}
