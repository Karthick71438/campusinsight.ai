import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Clock,
  GitCommit,
  Layers,
  AlertTriangle,
  GitBranch,
  ArrowDown,
  Sparkles,
  Flame,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import MasteryBadge from './MasteryBadge';
import ActionBadge from './ActionBadge';
import { api } from '../services/api';

export default function NodeDetailDrawer({
  concept,
  activeStudentId = 'student-demo-1',
  onClose,
  onStartQuiz,
  onToggleComplete,
}) {
  const [weakPathData, setWeakPathData] = useState(null);
  const [loadingPath, setLoadingPath] = useState(false);

  useEffect(() => {
    if (!concept?.id) {
      setWeakPathData(null);
      return;
    }

    let isMounted = true;
    const fetchPath = async () => {
      setLoadingPath(true);
      try {
        const res = await api.getWeakPath(activeStudentId, concept.id);
        if (isMounted) setWeakPathData(res);
      } catch (err) {
        console.error('Failed to fetch reverse path analysis:', err);
      } finally {
        if (isMounted) setLoadingPath(false);
      }
    };

    fetchPath();
    return () => {
      isMounted = false;
    };
  }, [concept?.id, activeStudentId]);

  if (!concept) return null;

  const {
    id,
    name,
    description,
    mastery_score = 0,
    stability = 'At Risk',
    days_since_practice,
    prerequisites = [],
    downstream_impacts = [],
    is_root_gap,
  } = concept;

  const isBottleneck = weakPathData?.is_bottleneck;
  const rootCause = weakPathData?.root_cause_concept;
  const recAction = weakPathData?.recommended_action;

  const isUnattempted = concept.assessed === false || stability === 'Unattempted' || (!stability && !mastery_score);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-mono text-teal-400 uppercase tracking-widest block mb-1">
            Reverse-Path Diagnostic Inspector
          </span>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">{name}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Retention Status</span>
            {isUnattempted ? (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono font-medium bg-slate-800 text-amber-300 border border-slate-700">
                Unattempted (Pending)
              </span>
            ) : (
              <MasteryBadge stability={stability} score={mastery_score} />
            )}
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Last Practiced</span>
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200 font-semibold">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isUnattempted
                  ? 'Not Yet Assessed'
                  : days_since_practice !== null && days_since_practice !== undefined
                  ? `${days_since_practice} days ago`
                  : 'Not practiced'}
              </span>
            </div>
          </div>
        </div>

        {/* REVERSE-PATH ROOT CAUSE SECTION */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950/90 to-slate-900/90 border border-teal-500/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-teal-400" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
                Reverse-Path Root Cause Analyzer
              </h3>
            </div>
            {recAction?.action && <ActionBadge actionType={recAction.action} size="xs" />}
          </div>

          {loadingPath ? (
            <div className="py-6 text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-teal-400 animate-spin mx-auto" />
              <p className="text-[11px] font-mono text-slate-400">Tracing prerequisite graph...</p>
            </div>
          ) : (
            <>
              {/* Bottleneck Recommendation Banner */}
              {isBottleneck && rootCause ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Root Cause Bottleneck Detected: {rootCause.name}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {recAction?.explanation ||
                      `Your struggle in ${name} stems directly from unaddressed decay in prerequisite ${rootCause.name} (${rootCause.score?.toFixed(0)}%).`}
                  </p>
                  <button
                    onClick={() => onStartQuiz(rootCause.id)}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Remediate Prerequisite: {rootCause.name}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="text-[11px]">
                    {recAction?.explanation || 'Prerequisite chain is solid. No foundational bottlenecks identified.'}
                  </span>
                </div>
              )}

              {/* Upstream Reverse-Path Nodes Visual Chain */}
              {weakPathData?.reverse_path?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">
                    Upstream Lineage ("Where did weakness originate?"):
                  </span>
                  <div className="space-y-2">
                    {weakPathData.reverse_path.map((node, idx) => {
                      const isTarget = node.id === concept.id;
                      const isRoot = node.role.includes('Root Cause');
                      return (
                        <div
                          key={node.id}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                            isRoot
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                              : isTarget
                              ? 'bg-teal-500/10 border-teal-500/30 text-teal-200'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{node.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-900 border border-slate-800 text-slate-400">
                                {node.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{node.explanation}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-xs">{node.score?.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Downstream Impact Cascade */}
              {weakPathData?.downstream_impact?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">
                    Downstream Cascade ("What will this affect?"):
                  </span>
                  <div className="space-y-1.5">
                    {weakPathData.downstream_impact.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs"
                      >
                        <span className="text-slate-200 font-medium">{d.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            d.status.includes('Blocked')
                              ? 'bg-rose-500/20 text-rose-300'
                              : d.status.includes('Risk')
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Curriculum Definition */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Curriculum Definition
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            {description || 'Fundamental programming concept in the data structures and algorithms core track.'}
          </p>
        </div>

        {/* Prerequisites */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-teal-400" />
            <span>Direct Prerequisites (Incoming Edges)</span>
          </h4>
          {prerequisites.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-950/30 p-3 rounded-lg border border-slate-800/40">
              Foundational entry concept — no prerequisite dependencies required.
            </div>
          ) : (
            <div className="space-y-2">
              {prerequisites.map((pId) => (
                <div
                  key={pId}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-xs font-medium text-slate-200"
                >
                  <span className="font-mono text-teal-300">{pId.replace('concept-', '').toUpperCase()}</span>
                  <button
                    onClick={() => onStartQuiz(pId)}
                    className="text-xs text-teal-400 hover:text-teal-300 font-bold underline"
                  >
                    Test Prereq
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="p-6 border-t border-slate-800 bg-slate-950/80 space-y-2.5">
        <button
          onClick={() => onStartQuiz(id, name)}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>Launch Diagnostic Quiz for {name}</span>
        </button>

        {onToggleComplete && (
          <button
            onClick={() => onToggleComplete(id, mastery_score >= 70)}
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mastery_score >= 70
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                : 'bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-500/20 hover:border-teal-500/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{mastery_score >= 70 ? 'Mark Incomplete (Reset Topic)' : 'Mark Topic as Completed & Mastered'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
