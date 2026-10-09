import React from 'react';
import { HelpCircle, ArrowRight, Zap, Check, AlertOctagon, GitMerge } from 'lucide-react';
import ActionBadge from './ActionBadge';

export default function WhyExplanation({ recommendation, onStartQuiz }) {
  if (!recommendation) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p className="text-sm">No active urgent revisions. All prerequisites are currently stable!</p>
      </div>
    );
  }

  const {
    concept_id,
    concept_name,
    priority,
    current_mastery,
    previous_mastery,
    days_since_practice,
    headline,
    reason,
    why_factors = [],
    root_cause_concept,
    impacted_concepts = [],
    action_type,
  } = recommendation;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-2xl backdrop-blur-xl">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/40 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-teal-400 fill-teal-400" />
            Top Priority #{priority}
          </span>
          <ActionBadge actionType={action_type || (root_cause_concept ? 'REMEDIATE' : 'REVIEW')} size="sm" />
        </div>
        <div className="text-xs font-mono text-teal-400 font-semibold">
          Smart Recommendation
        </div>
      </div>

      {/* Recommendation Headline */}
      <h3 className="text-2xl font-extrabold text-slate-100 tracking-tight mb-2">
        {headline}
      </h3>
      <p className="text-slate-300 text-sm leading-relaxed mb-5">
        {reason}
      </p>

      {/* Explainable Why Factors Breakdown */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-6 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800/80">
          <HelpCircle className="w-4 h-4 text-teal-400" />
          <span>Why this topic? (How we figured it out)</span>
        </div>

        <ul className="space-y-2 pt-1 text-sm text-slate-200">
          {why_factors.map((factor, index) => (
            <li key={index} className="flex items-start gap-2.5 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
              <span>{factor}</span>
            </li>
          ))}
          {impacted_concepts.length > 0 && (
            <li className="flex items-start gap-2.5 leading-snug text-amber-300">
              <GitMerge className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <span>
                Resolving this concept unblocks downstream understanding for:{' '}
                <strong>{impacted_concepts.join(', ')}</strong>
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Action CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-400 font-medium">
          Estimated completion time: <span className="font-mono text-slate-200 font-bold">~3 minutes</span> (5 questions)
        </div>
        <button
          onClick={() => onStartQuiz(concept_id)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Start Revision Quiz</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
