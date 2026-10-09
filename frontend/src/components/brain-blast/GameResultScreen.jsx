import React from 'react';
import {
  Trophy,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
  Zap,
  Award,
  ShieldAlert,
} from 'lucide-react';

export default function GameResultScreen({
  gameTitle,
  score,
  bestScore,
  isNewBest,
  accuracy,
  timeSeconds,
  cognitiveMetrics = {},
  onPlayAgain,
  onBackToHub,
}) {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Top Victory Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-teal-500/20 via-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 shadow-lg shadow-teal-500/20">
            <Trophy className="w-8 h-8 text-teal-400" />
          </div>

          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-bold block mb-1">
              Brain Blast Completed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {gameTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Great mental workout! Your mind is refreshed and primed for your next study topic.
            </p>
          </div>

          {isNewBest && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono animate-bounce">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}

          {/* Primary Stats Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-mono mb-1">
                <Award className="w-3.5 h-3.5 text-teal-400" />
                <span>Score</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100">
                {score}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Best: {bestScore || score}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-mono mb-1">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span>Accuracy</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-400">
                {Math.round(accuracy)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Precision</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-mono mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Time</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300">
                {formatTime(timeSeconds)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Duration</span>
            </div>
          </div>

          {/* LearnGraph Cognitive Indicators Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                Cognitive Refresh Indicators
              </span>
              <span className="text-[10px] font-mono text-slate-500">Session Benchmark</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Memory</span>
                <span className="text-xs font-bold text-emerald-400">
                  {cognitiveMetrics.memory || 'Strong'}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Attention</span>
                <span className="text-xs font-bold text-teal-400">
                  {cognitiveMetrics.attention || 'Focused'}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Reaction</span>
                <span className="text-xs font-bold text-amber-300 font-mono">
                  {cognitiveMetrics.reaction || 'Fast'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5 pt-1">
              <ShieldAlert className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Game performance indicators only. Designed as playful mental refreshers between academic study blocks, not medical or psychological evaluations.
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={onPlayAgain}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>

            <button
              onClick={onBackToHub}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Brain Blast</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
