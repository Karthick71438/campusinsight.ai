import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Volume2, RotateCcw, Zap } from 'lucide-react';
import GameResultScreen from './GameResultScreen';

const PADS = [
  {
    id: 0,
    label: 'Teal',
    colorName: 'teal',
    bgIdle: 'bg-teal-950/60 border-teal-500/40 text-teal-300 hover:bg-teal-900/60',
    bgActive: 'bg-teal-400 border-white text-slate-950 shadow-xl shadow-teal-400/60 scale-105 ring-4 ring-teal-400/40',
  },
  {
    id: 1,
    label: 'Amber',
    colorName: 'amber',
    bgIdle: 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60',
    bgActive: 'bg-amber-400 border-white text-slate-950 shadow-xl shadow-amber-400/60 scale-105 ring-4 ring-amber-400/40',
  },
  {
    id: 2,
    label: 'Blue',
    colorName: 'blue',
    bgIdle: 'bg-blue-950/60 border-blue-500/40 text-blue-300 hover:bg-blue-900/60',
    bgActive: 'bg-blue-400 border-white text-slate-950 shadow-xl shadow-blue-400/60 scale-105 ring-4 ring-blue-400/40',
  },
  {
    id: 3,
    label: 'Rose',
    colorName: 'rose',
    bgIdle: 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/60',
    bgActive: 'bg-rose-400 border-white text-slate-950 shadow-xl shadow-rose-400/60 scale-105 ring-4 ring-rose-400/40',
  },
];

export default function MemorySequenceGame({ onComplete, onBackToHub, bestScore }) {
  const [level, setLevel] = useState(1);
  const maxLevels = 5; // Level 1 (len 3) to Level 5 (len 7)
  const [sequence, setSequence] = useState([]);
  const [userStep, setUserStep] = useState(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Watch the sequence carefully...');
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const startNewLevel = (lvl, existingSeq = []) => {
    setIsPlayingSequence(true);
    setStatusMessage('Watch the pattern...');
    setUserStep(0);

    // Sequence length starts at 3, increases by 1 each level
    const targetLength = 2 + lvl;
    const newSeq = [...existingSeq];
    while (newSeq.length < targetLength) {
      newSeq.push(Math.floor(Math.random() * 4));
    }
    setSequence(newSeq);

    // Play playback
    let i = 0;
    const interval = setInterval(() => {
      if (i < newSeq.length) {
        const padId = newSeq[i];
        setActivePad(padId);
        setTimeout(() => setActivePad(null), 400);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsPlayingSequence(false);
          setStatusMessage('Your turn! Tap the pads in the same order.');
        }, 300);
      }
    }, 650);
  };

  const initializeGame = () => {
    setLevel(1);
    setUserStep(0);
    setMistakes(0);
    setElapsedSeconds(0);
    setStartTime(Date.now());
    setIsFinished(false);
    startNewLevel(1, []);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  // Timer
  useEffect(() => {
    if (isFinished || !startTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  const handlePadClick = (padId) => {
    if (isPlayingSequence || isFinished) return;

    // Flash clicked pad
    setActivePad(padId);
    setTimeout(() => setActivePad(null), 250);

    const expected = sequence[userStep];
    if (padId === expected) {
      const nextStep = userStep + 1;
      setUserStep(nextStep);

      // Check if sequence completed
      if (nextStep === sequence.length) {
        setStatusMessage('Great job! Level cleared!');
        if (level < maxLevels) {
          setTimeout(() => {
            setLevel((l) => l + 1);
            startNewLevel(level + 1, sequence);
          }, 900);
        } else {
          // Finished all 5 levels!
          const score = Math.max(100, Math.round(1000 - mistakes * 100 - elapsedSeconds * 5));
          const accuracy = Math.max(20, Math.round(100 - (mistakes / 5) * 50));
          setFinalScore(score);
          setIsFinished(true);

          if (onComplete) {
            onComplete({
              score,
              accuracy,
              timeSeconds: elapsedSeconds,
              cognitiveMetrics: {
                memory: level >= 4 ? 'Exceptional' : 'Strong',
                attention: mistakes === 0 ? 'Flawless' : 'Good',
                reaction: 'Steady',
              },
            });
          }
        }
      }
    } else {
      // Wrong pad clicked
      setMistakes((m) => m + 1);
      setStatusMessage('Oops! Replaying this pattern...');
      setIsPlayingSequence(true);
      setTimeout(() => {
        startNewLevel(level, sequence);
      }, 1000);
    }
  };

  if (isFinished) {
    const accuracy = Math.max(20, Math.round(100 - (mistakes / 5) * 50));
    return (
      <GameResultScreen
        gameTitle="Memory Sequence"
        score={finalScore}
        bestScore={bestScore}
        isNewBest={!bestScore || finalScore > bestScore}
        accuracy={accuracy}
        timeSeconds={elapsedSeconds}
        cognitiveMetrics={{
          memory: level >= 4 ? 'Exceptional' : 'Strong',
          attention: mistakes === 0 ? 'High Focus' : 'Good',
          reaction: 'Consistent',
        }}
        onPlayAgain={initializeGame}
        onBackToHub={onBackToHub}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>🎛️ Memory Sequence</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                Level {level}/{maxLevels} (Length {2 + level})
              </span>
            </h2>
            <p className="text-xs text-slate-400">Remember and repeat the sequence in exact order.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Progress</span>
            <span className="font-bold text-teal-400">
              {userStep}/{sequence.length}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Time</span>
            <span className="font-bold text-amber-400">{elapsedSeconds}s</span>
          </div>
        </div>
      </div>

      {/* Main Board */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
        {/* Status prompt */}
        <div
          className={`py-2 px-4 rounded-xl text-xs font-bold font-mono transition-all inline-block ${
            isPlayingSequence
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse'
              : 'bg-teal-500/10 border border-teal-500/30 text-teal-300'
          }`}
        >
          {statusMessage}
        </div>

        {/* 4 Colored Pads 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-sm mx-auto">
          {PADS.map((pad) => {
            const isActive = activePad === pad.id;
            return (
              <button
                key={pad.id}
                onClick={() => handlePadClick(pad.id)}
                disabled={isPlayingSequence}
                className={`h-32 sm:h-36 rounded-3xl border-2 transition-all duration-150 transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-2 select-none ${
                  isActive ? pad.bgActive : pad.bgIdle
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 ${
                    isActive ? 'bg-white border-white scale-125' : 'bg-transparent border-current'
                  }`}
                />
                <span className="text-xs font-mono uppercase font-bold tracking-wider opacity-80">
                  {pad.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-500 font-mono">
          Each level adds +1 to the sequence length. Watch the glow!
        </p>
      </div>
    </div>
  );
}
