import React, { useState } from 'react';
import { PlayCircle, Clock, RotateCcw, AlertTriangle, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

export default function DemoController({ currentStage, onStageChanged, activeStudentId }) {
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const stages = [
    {
      key: 'stage_1_initial',
      stepNum: 1,
      shortLabel: 'Initial Mastery (90%)',
      desc: 'Recursion mastered at 90% (Strong standing).',
      badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
    },
    {
      key: 'stage_2_decay',
      stepNum: 2,
      shortLabel: '21-Day Gap (55%)',
      desc: '21 days without practice. Recursion decays to 55% (Weakening).',
      badgeColor: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
    },
    {
      key: 'stage_3_failed_trees',
      stepNum: 3,
      shortLabel: 'Trees Fails (Root Cause)',
      desc: 'Trees quiz fails (40%). Recursion flagged as prerequisite root gap!',
      badgeColor: 'border-rose-500/50 text-rose-400 bg-rose-500/10',
    },
    {
      key: 'stage_4_revised',
      stepNum: 4,
      shortLabel: 'Revised (88% Restored)',
      desc: 'Recursion revision quiz completed. Mastery restored to 88%!',
      badgeColor: 'border-teal-500/50 text-teal-300 bg-teal-500/10',
    },
  ];

  const handleSelectStage = async (stageKey) => {
    setLoading(true);
    try {
      const res = await api.setDemoStage(stageKey);
      setToastMessage(`Switched to: ${res.label}`);
      if (onStageChanged) onStageChanged(stageKey);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to set demo stage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateCustomGap = async () => {
    setLoading(true);
    try {
      const res = await api.simulateGap(activeStudentId, 'concept-recursion', 21);
      setToastMessage(res.signal);
      if (onStageChanged) onStageChanged('stage_2_decay');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to simulate gap:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border-y border-teal-500/30 px-4 py-3 backdrop-blur-xl shadow-2xl relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Title & Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-teal-400 font-mono">
                Judges Demo Storyboard
              </span>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono text-[10px] font-bold border border-teal-500/20">
                1-Click Simulation
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Trigger live deterministic state transitions: BEFORE → DECAY → ROOT CAUSE → AFTER.
            </p>
          </div>
        </div>

        {/* Storyboard Stage Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {stages.map((st) => {
            const isActive = currentStage === st.key;
            return (
              <button
                key={st.key}
                disabled={loading}
                onClick={() => handleSelectStage(st.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-lg shadow-teal-500/25 scale-105'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
                title={st.desc}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
                    isActive ? 'bg-slate-950 text-teal-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {st.stepNum}
                </span>
                <span>{st.shortLabel}</span>
              </button>
            );
          })}

          {/* Quick 21-Day Gap simulation shortcut button */}
          <button
            disabled={loading}
            onClick={handleSimulateCustomGap}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all hover:scale-105"
            title="Simulate 21 days without practice on Recursion"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Simulate 21d Gap</span>
          </button>
        </div>
      </div>

      {/* Floating Real-Time Toast */}
      {toastMessage && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-teal-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
