import React from 'react';
import {
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  GitBranch,
  ArrowRight,
  Flame,
} from 'lucide-react';
import KnowledgeGraph from '../components/KnowledgeGraph';
import WhyExplanation from '../components/WhyExplanation';
import MasteryBadge from '../components/MasteryBadge';

export default function DashboardPage({
  masteryOverview,
  graphData,
  topRecommendation,
  onSelectNode,
  onStartQuiz,
  onNavigateToTab,
  displayName,
}) {
  if (!masteryOverview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-teal-400 font-mono text-sm animate-pulse flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span>Synchronizing student knowledge graph...</span>
        </div>
      </div>
    );
  }

  const {
    student_name,
    overall_mastery,
    strong_count,
    stable_count,
    weakening_count,
    at_risk_count,
    concepts = [],
  } = masteryOverview;

  // Use displayName (nickname/name from localStorage) first, fall back to API student_name
  const headingName = displayName || student_name;

  return (
    <div className="space-y-8">
      {/* Student Welcome & High-level Metrics Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-teal-400 uppercase tracking-wider block mb-1">
            Learning Progress &amp; Memory Overview
          </span>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {headingName}'s Knowledge Map
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            See what you remember, what needs a quick review, and what to study next.
          </p>
        </div>

        {/* Aggregate Mastery Badge */}
        <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl backdrop-blur-md">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Overall Retention</span>
            <span className="text-2xl font-black font-mono text-teal-400">{Math.round(overall_mastery)}%</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-teal-400" />
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Strong</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400">{strong_count}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Retention &ge; 85%</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-blue-500/30 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stable</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-blue-400">{stable_count}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Retention 70–84%</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/30 shadow-lg backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weakening</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-amber-400">{weakening_count}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Needs Review (50–69%)</span>
          {weakening_count > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-rose-500/30 shadow-lg backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">At Risk</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-400">{at_risk_count}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Mastery &lt; 50%</span>
        </div>
      </div>

      {/* Top Explainable Revision Recommendation */}
      <WhyExplanation
        recommendation={topRecommendation}
        onStartQuiz={onStartQuiz}
      />

      {/* Brain Blast Mini-Break Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-violet-950/25 to-slate-900/90 border border-violet-500/30 p-5 sm:p-6 backdrop-blur-xl shadow-xl hover:border-violet-500/50 transition-all duration-300 group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-teal-500/10 border border-violet-500/30 flex items-center justify-center text-2xl shrink-0 shadow-md group-hover:scale-110 transition-transform">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                  <span>Brain Blast</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold uppercase tracking-wider">
                    Cognitive Refresher
                  </span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Take a quick mental break with mini brain challenges.
              </p>
              <span className="text-[11px] text-slate-500 font-mono mt-1 hidden md:block">
                6 mini games • Memory, Pattern, Speed, Logic, Sequence &amp; Reaction
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => onNavigateToTab('brain-blast')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-teal-500 hover:from-violet-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 cursor-pointer active:scale-98"
            >
              <span>Explore Games</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Living Knowledge Graph */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Interactive Concept Graph
            </h2>
          </div>
          <button
            onClick={() => onNavigateToTab('graph')}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Fullscreen View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <KnowledgeGraph
          graphData={graphData}
          onSelectNode={onSelectNode}
        />
      </div>

      {/* Concept Breakdown Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100">Topic-by-Topic Retention</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {concepts.map((concept) => (
            <div
              key={concept.concept_id}
              onClick={() => onSelectNode(concept)}
              className={`p-4 rounded-xl bg-slate-900/80 border transition-all cursor-pointer hover:border-teal-500/40 hover:scale-[1.01] ${
                concept.is_bottleneck
                  ? 'border-rose-500/50 shadow-lg shadow-rose-500/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{concept.name}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Last review: {concept.last_practiced}
                  </span>
                </div>
                <MasteryBadge stability={concept.stability} score={concept.mastery_score} />
              </div>

              {concept.is_bottleneck && (
                <div className="mt-2 py-1 px-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Important: Needed before learning Trees</span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                <span className="text-slate-400">
                  {concept.days_since_practice !== null
                    ? `${concept.days_since_practice} days elapsed`
                    : 'Not practiced'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartQuiz(concept.concept_id);
                  }}
                  className="text-teal-400 hover:text-teal-300 font-bold"
                >
                  Test →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
