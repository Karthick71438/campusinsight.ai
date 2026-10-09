import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  Sparkles,
  Trophy,
  Clock,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Layers,
  Flame,
  Award,
  ArrowLeft,
} from 'lucide-react';

import MemoryMatchGame from '../components/brain-blast/MemoryMatchGame';
import QuickPatternGame from '../components/brain-blast/QuickPatternGame';
import SpeedSortGame from '../components/brain-blast/SpeedSortGame';
import OddOneOutGame from '../components/brain-blast/OddOneOutGame';
import MemorySequenceGame from '../components/brain-blast/MemorySequenceGame';
import ReactionBlastGame from '../components/brain-blast/ReactionBlastGame';

const GAMES_LIST = [
  {
    id: 'memory-match',
    title: 'Memory Match',
    subtitle: 'Visual Pair Recall',
    iconEmoji: '🃏',
    description: 'Briefly memorize face-up cards and pair identical symbols before moves run out.',
    difficulty: 'Easy',
    difficultyColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    timeEst: '1–2 min',
    cognitiveTag: 'Working Memory',
    component: MemoryMatchGame,
  },
  {
    id: 'quick-pattern',
    title: 'Quick Pattern',
    subtitle: 'Sequence & Deductive Logic',
    iconEmoji: '🧩',
    description: 'Discover the progressive rule hidden inside numbers and symbols to pick the next step.',
    difficulty: 'Medium',
    difficultyColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    timeEst: '1–2 min',
    cognitiveTag: 'Pattern Recognition',
    component: QuickPatternGame,
  },
  {
    id: 'speed-sort',
    title: 'Speed Sort',
    subtitle: 'Rapid Binary Classification',
    iconEmoji: '⚡',
    description: 'Classify numbers and letters under shifting rules as fast as possible against the clock.',
    difficulty: 'Fast',
    difficultyColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    timeEst: '1 min',
    cognitiveTag: 'Cognitive Speed',
    component: SpeedSortGame,
  },
  {
    id: 'odd-one-out',
    title: 'Odd One Out',
    subtitle: 'Analytical Anomaly Spotting',
    iconEmoji: '🎯',
    description: 'Identify the single item that violates the underlying relationship shared by all others.',
    difficulty: 'Easy',
    difficultyColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    timeEst: '1–2 min',
    cognitiveTag: 'Attention to Detail',
    component: OddOneOutGame,
  },
  {
    id: 'memory-sequence',
    title: 'Memory Sequence',
    subtitle: 'Sequential Color Chains',
    iconEmoji: '🎛️',
    description: 'Watch visual light sequences fire across colored pads and reproduce the chain without errors.',
    difficulty: 'Medium',
    difficultyColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    timeEst: '2 min',
    cognitiveTag: 'Sequential Recall',
    component: MemorySequenceGame,
  },
  {
    id: 'reaction-blast',
    title: 'Reaction Blast',
    subtitle: 'Impulse & Latency Testing',
    iconEmoji: '⏱️',
    description: 'React the exact millisecond green targets ignite while ignoring sudden distractor prompts.',
    difficulty: 'Fast',
    difficultyColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    timeEst: '1 min',
    cognitiveTag: 'Reaction Time',
    component: ReactionBlastGame,
  },
];

export default function BrainBlastPage({ onNavigateToTab, activeStudentId = 'student-demo-1' }) {
  const [activeGameId, setActiveGameId] = useState(null);

  // Persistence: best scores per student
  const storageKey = `learnGraph_brain_blast_${activeStudentId}`;
  const [scoresData, setScoresData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Re-load scores if active student changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setScoresData(saved ? JSON.parse(saved) : {});
    } catch {
      setScoresData({});
    }
  }, [storageKey]);

  const handleGameComplete = (gameId, result) => {
    const prevBest = scoresData[gameId]?.bestScore || 0;
    const newBest = Math.max(prevBest, result.score || 0);

    const updated = {
      ...scoresData,
      [gameId]: {
        bestScore: newBest,
        lastScore: result.score,
        lastAccuracy: result.accuracy,
        lastPlayed: new Date().toISOString(),
        totalSessions: (scoresData[gameId]?.totalSessions || 0) + 1,
      },
    };

    setScoresData(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist Brain Blast score to localStorage', err);
    }
  };

  const activeGame = GAMES_LIST.find((g) => g.id === activeGameId);

  // If a game is currently active, render the game arena
  if (activeGame) {
    const GameComponent = activeGame.component;
    const currentBest = scoresData[activeGame.id]?.bestScore || 0;

    return (
      <div className="space-y-6">
        <GameComponent
          onComplete={(result) => handleGameComplete(activeGame.id, result)}
          onBackToHub={() => setActiveGameId(null)}
          bestScore={currentBest}
        />
      </div>
    );
  }

  // Calculate high-level student stats
  const totalSessionsCompleted = Object.values(scoresData).reduce(
    (acc, cur) => acc + (cur.totalSessions || 0),
    0
  );
  const highestScore = Math.max(
    0,
    ...Object.values(scoresData).map((v) => v.bestScore || 0)
  );
  const gamesPlayedCount = Object.keys(scoresData).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-900/50 p-6 sm:p-7 rounded-3xl border border-slate-800/80 backdrop-blur-md">
        <div className="max-w-xl space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-lg">
              🧠
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Brain Blast
            </h1>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            Quick challenges to refresh your mind.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Short, focused cognitive mini-games designed to stimulate memory, attention, reaction, and logic between study sessions.
          </p>
        </div>

        {/* Aggregate Stats Card */}
        <div className="shrink-0 flex items-center gap-3 sm:gap-4 bg-slate-950/70 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl backdrop-blur-md">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Sessions</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-teal-400">
              {totalSessionsCompleted}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">High Score</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              {highestScore}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Games Tried</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-violet-400">
              {gamesPlayedCount}/6
            </span>
          </div>
        </div>
      </div>

      {/* ── 6 Game Cards Grid ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Select a Brain Challenge</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">1–3 minutes per game</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {GAMES_LIST.map((game) => {
            const gameStat = scoresData[game.id];
            const hasPlayed = !!gameStat?.bestScore;

            return (
              <div
                key={game.id}
                className="group relative rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-teal-500/40 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/5 backdrop-blur-xl"
              >
                <div>
                  {/* Top Row: Icon + Difficulty Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
                      {game.iconEmoji}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${game.difficultyColor}`}
                      >
                        {game.difficulty}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {game.timeEst}
                      </span>
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-lg font-extrabold text-slate-100 group-hover:text-teal-300 transition-colors">
                    {game.title}
                  </h3>
                  <span className="text-xs font-semibold text-teal-400/90 block mb-2 font-mono">
                    {game.subtitle}
                  </span>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {game.description}
                  </p>
                </div>

                {/* Bottom Section: Best Score & Launch CTA */}
                <div className="pt-4 border-t border-slate-800/70 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 text-[11px]">
                      {hasPlayed ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Best: {gameStat.bestScore} pts
                        </span>
                      ) : (
                        <span className="text-slate-500">Not played yet</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/60">
                      {game.cognitiveTag}
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveGameId(game.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 group-hover:bg-gradient-to-r group-hover:from-teal-500 group-hover:to-emerald-500 border border-slate-800 group-hover:border-transparent text-slate-200 group-hover:text-slate-950 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{hasPlayed ? 'Play Again' : 'Start Game'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer Guidance Note ────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            Brain Blast mini-games provide playful mental breaks between learning sessions. Designed to activate working memory, cognitive flexibility, and attention.
          </span>
        </div>
        <button
          onClick={() => onNavigateToTab('dashboard')}
          className="text-teal-400 hover:text-teal-300 font-bold whitespace-nowrap text-xs flex items-center gap-1 transition-colors"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
