import React from 'react';
import { ListOrdered, HelpCircle, ArrowRight, Zap, Flame, Clock, GitMerge } from 'lucide-react';
import MasteryBadge from '../components/MasteryBadge';
import ActionBadge from '../components/ActionBadge';

export default function RevisionPage({ recommendationsData, onStartQuiz }) {
  const recommendations = recommendationsData?.recommendations || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ListOrdered className="w-5 h-5 text-teal-400" />
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Smart Revision Queue
          </h1>
        </div>
        <p className="text-sm text-slate-400">
          Personalized revision list that fixes foundational basics first, so advanced topics become easier.
        </p>
      </div>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <h3 className="font-bold text-slate-200 text-lg mb-1">Queue Empty</h3>
          <p className="text-sm">All concept prerequisites are currently at strong stability levels.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {recommendations.map((rec) => {
            const isTop = rec.priority === 1;
            const isBottleneck = !!rec.root_cause_concept;

            return (
              <div
                key={rec.id}
                className={`relative rounded-2xl p-6 transition-all backdrop-blur-xl border ${
                  isTop
                    ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/40 border-teal-500/40 shadow-xl shadow-teal-500/10'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                {/* Top Badge Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full font-mono text-xs font-bold border flex items-center gap-1.5 ${
                        isTop
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Priority #{rec.priority}
                    </span>

                    <ActionBadge actionType={rec.action_type || (isBottleneck ? 'REMEDIATE' : 'REVIEW')} size="sm" />
                  </div>

                  <div className="flex items-center gap-2">
                    <MasteryBadge stability={rec.stability} score={rec.current_mastery} />
                  </div>
                </div>

                {/* Main Headline */}
                <h3 className="text-xl font-bold text-slate-100 mb-2">{rec.headline}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">{rec.reason}</p>

                {/* Explainable Why Factors */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-5">
                  <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block mb-2">
                    Why this intervention rank?
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {rec.why_factors?.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {rec.impacted_concepts?.length > 0 && (
                      <li className="flex items-start gap-2 text-amber-300 font-medium">
                        <GitMerge className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          Blocking downstream progress in: <strong>{rec.impacted_concepts.join(', ')}</strong>
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Action CTA */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {rec.days_since_practice !== null ? `${rec.days_since_practice}d since practice` : 'Never'}
                    </span>
                    <span>•</span>
                    <span>Priority Score: {rec.priority_score.toFixed(1)} / 100</span>
                  </div>

                  <button
                    onClick={() => onStartQuiz(rec.concept_id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>Launch Revision Quiz</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
