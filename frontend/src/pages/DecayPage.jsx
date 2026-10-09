import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  TrendingDown,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  History,
  BookOpen,
  Layers,
  AlertCircle,
  RotateCcw,
  PlusCircle,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import DecayChart from '../components/DecayChart';
import MasteryBadge from '../components/MasteryBadge';
import {
  getDkTopics,
  simulateTopicGap,
  clearDkTopics,
  addOrUpdateDkTopic,
  addMultipleDkTopics,
  getActiveMaterial,
} from '../data/dkTopicsStore';
import { api } from '../services/api';

export default function DecayPage({
  activeStudentId,
  currentStudent,
  displayName,
  onRefresh,
  onStartQuiz,
  onNavigateToTab,
}) {
  const studentId = activeStudentId || 'student-demo-1';

  // ── Tracked Topics State (Loaded dynamically from Quiz selections/results) ──
  const [topics, setTopics] = useState(() => getDkTopics(studentId));
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '');

  // ── Simulator State ───────────────────────────────────────────────────────
  const [simDays, setSimDays] = useState(21);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Sync topics when student changes, when remote DB is queried, or when 'dk-topics-updated' event fires
  useEffect(() => {
    const refresh = () => {
      const updated = getDkTopics(studentId);
      setTopics(updated);
      setSelectedTopicId((prev) => {
        if (updated.length === 0) return '';
        if (updated.some((t) => t.id === prev)) return prev;
        return updated[0]?.id || '';
      });
    };

    refresh();

    // Query backend SQLite database ONLY if active PDF material is uploaded
    const activeMat = getActiveMaterial(studentId);
    if (activeMat && activeMat.topics && activeMat.topics.length > 0) {
      api.getStudentDkTopics(studentId).then((res) => {
        if (res?.topics && res.topics.length > 0) {
          addMultipleDkTopics(studentId, res.topics);
          refresh();
        }
      }).catch((err) => {
        console.warn('Could not fetch backend dk topics:', err);
      });
    }

    const handler = (e) => {
      if (!e.detail || e.detail.studentId === studentId) {
        refresh();
      }
    };

    window.addEventListener('dk-topics-updated', handler);
    return () => window.removeEventListener('dk-topics-updated', handler);
  }, [studentId]);

  // Active selected topic
  const activeTopic = useMemo(() => {
    if (!topics || topics.length === 0) return null;
    return topics.find((t) => t.id === selectedTopicId) || topics[0];
  }, [topics, selectedTopicId]);

  // Handle Simulation
  const handleSimulate = () => {
    if (!activeTopic) return;
    setSimulating(true);
    setTimeout(() => {
      const updated = simulateTopicGap(studentId, activeTopic.id, simDays);
      setSimulating(false);
      if (updated) {
        setSimResult({
          signal: `Applied ${simDays}-day decay signal on ${updated.name}. Projected retention is now ${Math.round(
            updated.current_mastery
          )}% (${updated.stability}).`,
        });
        // Re-read topics
        setTopics(getDkTopics(studentId));
      }
    }, 250);
  };

  // Helper colors
  const stabilityColor = (s) => {
    if (s === 'Strong') return 'text-emerald-400';
    if (s === 'Stable') return 'text-blue-400';
    if (s === 'Weakening') return 'text-amber-400';
    return 'text-rose-400';
  };

  const masteryColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 65) return 'text-blue-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  // ── 1. Clean Empty State (When no PDF study material is uploaded yet) ──
  if (topics.length === 0) {
    return (
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
              DK Tracker
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-teal-400" />
              Knowledge Decay &amp; Memory Retention
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Topic-driven memory retention tracking modeled from your quiz assessments.
            </p>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400 shadow-lg shadow-teal-500/10">
            <TrendingDown className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-100">
              No topics tracked yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Topics will appear here only after uploading your study material or course syllabus PDF in the Quiz section.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToTab) onNavigateToTab('quiz');
                else if (onStartQuiz) onStartQuiz();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Go to Quiz &amp; Upload PDF</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Topic-Driven DK Tracker (When topics have been selected / quizzed) ──
  return (
    <div className="space-y-8">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-900/50 p-5 sm:p-6 rounded-3xl border border-slate-800/80 backdrop-blur-md">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingDown className="w-5 h-5 text-teal-400" />
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Knowledge Decay &amp; Memory Retention
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Topic-by-topic retention curves derived from your quiz assessments. Click any topic below to inspect its individual memory decay model.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onStartQuiz) onStartQuiz();
              else if (onNavigateToTab) onNavigateToTab('quiz');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Quiz More Topics</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all tracked topics and reset DK Tracker to empty state?')) {
                clearDkTopics(studentId);
              }
            }}
            title="Reset topics to empty state"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Selected Topics Section ────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Selected Topics
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
              {topics.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Click a topic to switch its DK graph &amp; retention progress:
          </p>
        </div>

        {/* Dynamic Topic Buttons / Cards */}
        <div className="flex flex-wrap gap-2.5">
          {topics.map((t) => {
            const isSelected = activeTopic?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTopicId(t.id);
                  setSimResult(null);
                }}
                className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-500/20 text-blue-200 border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                {/* Blue Active Dot */}
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isSelected
                      ? 'bg-blue-400 shadow-sm shadow-blue-400 animate-pulse'
                      : 'bg-slate-600 group-hover:bg-slate-500'
                  }`}
                />
                <span className="text-sm font-extrabold">{t.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                    isSelected
                      ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {t.assessed ? `DK: ${Math.round(t.current_mastery)}%` : 'Pending'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Topic Progress & Graph ─────────────────────────────────── */}
      {activeTopic && (
        <>
          {/* Active Topic Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-100">
                    {activeTopic.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                    {activeTopic.assessed ? 'Active Topic' : 'Unattempted Topic'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{activeTopic.summary}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onStartQuiz) onStartQuiz(activeTopic.id, activeTopic.name);
                  else if (onNavigateToTab) onNavigateToTab('quiz');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/20 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{activeTopic.assessed ? `Retake Quiz for ${activeTopic.name}` : `Attend Quiz for ${activeTopic.name}`}</span>
              </button>
            </div>
          </div>

          {!activeTopic.assessed ? (
            /* Unattempted State without fake curves */
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Clock className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-lg font-bold text-slate-100">
                  Diagnostic Assessment Pending
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  <b>{activeTopic.name}</b> was selected from your syllabus. No decay analysis or retention curve is modeled until you complete the diagnostic quiz.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onStartQuiz) onStartQuiz(activeTopic.id, activeTopic.name);
                    else if (onNavigateToTab) onNavigateToTab('quiz');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Attend Quiz for {activeTopic.name}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Reuse existing DK Chart for this active topic */}
              <DecayChart conceptDecay={activeTopic} />

          {/* ── Interactive Memory Simulator ───────────────────────────────── */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Interactive Memory Simulator — {activeTopic.name}</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Move the slider to see how memory for <b>{activeTopic.name}</b> naturally fades over days without practice, and how review recovers it.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Simulated Practice Gap:</span>
                  <span className="font-mono font-bold text-blue-300 text-sm">
                    {simDays} days without review
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="1"
                  value={simDays}
                  onChange={(e) => setSimDays(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 days (Immediate)</span>
                  <span>14 days</span>
                  <span>21 days</span>
                  <span>35+ days</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={simulating}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                  <span>Apply {simDays}-Day Decay Signal</span>
                </button>
              </div>
            </div>

            {simResult && (
              <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{simResult.signal}</span>
              </div>
            )}
          </div>

          {/* ── Topic-by-Topic Retention Audit Table ───────────────────────── */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              <span>Topic Retention Audit</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                    <th className="pb-3">Topic</th>
                    <th className="pb-3">Peak Mastery</th>
                    <th className="pb-3">Current DK</th>
                    <th className="pb-3">Gap (Days)</th>
                    <th className="pb-3">Stability</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {topics.map((t) => {
                    const isSelected = activeTopic?.id === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => {
                          setSelectedTopicId(t.id);
                          setSimResult(null);
                        }}
                        className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-500/10' : ''
                        }`}
                      >
                        <td className="py-3.5 font-bold text-slate-100 flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-blue-400' : 'bg-transparent'
                            }`}
                          />
                          {t.name}
                        </td>
                        <td className="py-3.5 font-mono text-emerald-400 font-semibold">
                          {Math.round(t.peak_mastery)}%
                        </td>
                        <td
                          className={`py-3.5 font-mono font-bold ${masteryColor(
                            t.current_mastery
                          )}`}
                        >
                          {Math.round(t.current_mastery)}%
                        </td>
                        <td className="py-3.5 font-mono text-slate-300">
                          {t.days_since_practice}d
                        </td>
                        <td className="py-3.5">
                          <MasteryBadge stability={t.stability} score={t.current_mastery} showScore={false} />
                        </td>
                        <td className={`py-3.5 font-semibold text-[11px] ${stabilityColor(t.stability)}`}>
                          {t.stability === 'Strong' && 'Stable foundation'}
                          {t.stability === 'Stable' && 'Maintaining retention'}
                          {t.stability === 'Weakening' && 'Revision recommended'}
                          {t.stability === 'At Risk' && 'Urgent review needed'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )}
</div>
);
}
