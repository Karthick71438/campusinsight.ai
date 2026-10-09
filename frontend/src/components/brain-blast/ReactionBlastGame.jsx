import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, Target, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import GameResultScreen from './GameResultScreen';

export default function ReactionBlastGame({ onComplete, onBackToHub, bestScore }) {
  const totalRounds = 5;
  const [currentRound, setCurrentRound] = useState(1);
  const [stage, setStage] = useState('waiting'); // 'waiting' | 'ready' | 'target' | 'distractor' | 'result'
  const [targetType, setTargetType] = useState('target'); // 'target' | 'distractor'
  const [reactionTimes, setReactionTimes] = useState([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [roundElapsedMs, setRoundElapsedMs] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const timeoutRef = useRef(null);

  // Setup round
  const schedulePrompt = () => {
    setStage('ready');
    setRoundElapsedMs(null);

    // Random delay between 1.5s and 3.2s
    const delay = Math.floor(Math.random() * 1700) + 1500;

    // 80% chance of target 🎯, 20% chance of distractor ⛔
    const isTarget = Math.random() < 0.8;
    setTargetType(isTarget ? 'target' : 'distractor');

    timeoutRef.current = setTimeout(() => {
      setRoundStartTime(performance.now());
      setStage(isTarget ? 'target' : 'distractor');
    }, delay);
  };

  const initializeGame = () => {
    setCurrentRound(1);
    setReactionTimes([]);
    setFalseStarts(0);
    setCorrectHits(0);
    setIsFinished(false);
    schedulePrompt();
  };

  useEffect(() => {
    initializeGame();
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleClickArena = () => {
    if (stage === 'ready') {
      // False start (clicked too early!)
      clearTimeout(timeoutRef.current);
      setFalseStarts((f) => f + 1);
      setStage('waiting');
      setTimeout(() => {
        schedulePrompt();
      }, 1000);
      return;
    }

    if (stage === 'target') {
      // Correct click! Measure millisecond reaction
      const diffMs = Math.round(performance.now() - roundStartTime);
      setRoundElapsedMs(diffMs);
      setReactionTimes((prev) => [...prev, diffMs]);
      setCorrectHits((c) => c + 1);
      setStage('round_feedback');

      setTimeout(() => {
        advanceRound(diffMs);
      }, 1000);
      return;
    }

    if (stage === 'distractor') {
      // Clicked on distractor (should have ignored it!)
      setFalseStarts((f) => f + 1);
      setStage('round_feedback');

      setTimeout(() => {
        advanceRound(null);
      }, 1000);
      return;
    }
  };

  const advanceRound = (recentMs) => {
    if (currentRound < totalRounds) {
      setCurrentRound((r) => r + 1);
      schedulePrompt();
    } else {
      // All 5 rounds completed!
      const validTimes = recentMs ? [...reactionTimes, recentMs] : reactionTimes;
      const avgMs =
        validTimes.length > 0
          ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
          : 500;

      // Score formula: faster avg reaction + accuracy gives higher score
      const speedScore = Math.max(100, Math.round(1000 - avgMs * 1.2));
      const penalty = falseStarts * 75;
      const score = Math.max(150, speedScore - penalty);
      const accuracy = Math.max(
        20,
        Math.round(((totalRounds - falseStarts) / totalRounds) * 100)
      );

      setFinalScore(score);
      setIsFinished(true);

      if (onComplete) {
        onComplete({
          score,
          accuracy,
          timeSeconds: Math.round(avgMs / 100) / 10,
          cognitiveMetrics: {
            memory: 'Good',
            attention: falseStarts === 0 ? 'Sharp Inhibitory Control' : 'Good',
            reaction: `${avgMs} ms`,
          },
        });
      }
    }
  };

  if (isFinished) {
    const avgMs =
      reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 450;
    const accuracy = Math.max(
      20,
      Math.round(((totalRounds - falseStarts) / totalRounds) * 100)
    );

    return (
      <GameResultScreen
        gameTitle="Reaction Blast"
        score={finalScore}
        bestScore={bestScore}
        isNewBest={!bestScore || finalScore > bestScore}
        accuracy={accuracy}
        timeSeconds={Math.round((avgMs * totalRounds) / 1000)}
        cognitiveMetrics={{
          memory: 'Good',
          attention: falseStarts === 0 ? 'Sharp Focus' : 'Good',
          reaction: `${avgMs} ms`,
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
              <span>⚡ Reaction Blast</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                Round {currentRound}/{totalRounds}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Click as soon as the GREEN target 🎯 appears!</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Hits</span>
            <span className="font-bold text-teal-400">{correctHits}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Last Speed</span>
            <span className="font-bold text-amber-400">
              {roundElapsedMs ? `${roundElapsedMs}ms` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Big Clickable Arena */}
      <div
        onClick={handleClickArena}
        className={`h-80 sm:h-96 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center p-6 select-none cursor-pointer shadow-2xl relative overflow-hidden ${
          stage === 'ready'
            ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
            : stage === 'target'
            ? 'bg-emerald-500/25 border-emerald-400 shadow-emerald-500/40 scale-102 ring-8 ring-emerald-500/20'
            : stage === 'distractor'
            ? 'bg-rose-500/25 border-rose-500 shadow-rose-500/30'
            : stage === 'waiting'
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        {stage === 'ready' && (
          <div className="space-y-3 pointer-events-none">
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-slate-700 flex items-center justify-center animate-ping">
              <span className="w-4 h-4 rounded-full bg-slate-500" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-300 tracking-tight">
              WAIT FOR GREEN TARGET...
            </h3>
            <p className="text-xs text-slate-500 font-mono">Do not click yet!</p>
          </div>
        )}

        {stage === 'target' && (
          <div className="space-y-3 pointer-events-none animate-scale-in">
            <div className="text-6xl sm:text-7xl">🎯</div>
            <h3 className="text-3xl sm:text-4xl font-black text-emerald-300 tracking-tight animate-bounce">
              CLICK NOW!
            </h3>
            <p className="text-xs text-emerald-400/80 font-mono">React as fast as you can!</p>
          </div>
        )}

        {stage === 'distractor' && (
          <div className="space-y-3 pointer-events-none animate-scale-in">
            <div className="text-6xl sm:text-7xl">⛔</div>
            <h3 className="text-2xl sm:text-3xl font-black text-rose-300 tracking-tight">
              DO NOT CLICK!
            </h3>
            <p className="text-xs text-rose-400/80 font-mono">Distractor! Wait it out.</p>
          </div>
        )}

        {stage === 'waiting' && (
          <div className="space-y-2 pointer-events-none">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
            <h4 className="text-lg font-bold text-amber-300">Too Early! False Start</h4>
            <p className="text-xs text-amber-400/80 font-mono">Wait until the target appears.</p>
          </div>
        )}

        {stage === 'round_feedback' && (
          <div className="space-y-2 pointer-events-none animate-fade-in">
            {roundElapsedMs ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <div className="text-4xl font-black font-mono text-emerald-300">
                  {roundElapsedMs} ms
                </div>
                <p className="text-xs text-slate-400 font-mono">Lightning fast!</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
                <div className="text-xl font-bold text-rose-300">Clicked Distractor!</div>
                <p className="text-xs text-slate-400 font-mono">Stay focused on the target only.</p>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-500 font-mono">
        Tests visual impulse reaction and attention focus. Fast, clean, and calibrated.
      </p>
    </div>
  );
}
