import React from 'react';
import KnowledgeGraph from '../components/KnowledgeGraph';
import {
  GitBranch,
  Info,
  Flame,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Zap,
  CircleDot,
  ArrowRight,
} from 'lucide-react';

// --- Colour + Stability Level Data ---
const STABILITY_LEVELS = [
  {
    key: 'strong',
    label: 'Strong',
    range: '>= 85%',
    color: 'bg-emerald-400',
    ring: 'ring-emerald-400/40',
    border: 'border-emerald-500/50',
    glow: 'shadow-emerald-500/20',
    textColor: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    icon: ShieldCheck,
    badge: 'Deeply Retained',
    meaning:
      'Concept is deeply retained. Mastery is high, practice gap is low, and prerequisite foundations are solid. No immediate action needed.',
    action: 'Challenge: advance to more complex dependent topics.',
  },
  {
    key: 'stable',
    label: 'Stable',
    range: '70 - 84%',
    color: 'bg-blue-400',
    ring: 'ring-blue-400/40',
    border: 'border-blue-500/50',
    glow: 'shadow-blue-500/20',
    textColor: 'text-blue-400',
    bgLight: 'bg-blue-500/10',
    icon: TrendingUp,
    badge: 'Well Retained',
    meaning:
      'Concept is well understood and retained. Slight practice gaps may exist but are not critical. A good foundation for downstream topics.',
    action: 'Advance: keep practising to push toward Strong standing.',
  },
  {
    key: 'weakening',
    label: 'Weakening',
    range: '50 - 69%',
    color: 'bg-amber-400',
    ring: 'ring-amber-400/40',
    border: 'border-amber-500/50',
    glow: 'shadow-amber-500/20',
    textColor: 'text-amber-400',
    bgLight: 'bg-amber-500/10',
    icon: TrendingDown,
    badge: 'Decaying',
    meaning:
      'Mastery is declining due to extended periods without practice. Memory decay has begun. Concepts in this state risk becoming blockers for downstream topics.',
    action: 'Review: spaced repetition revision recommended within 48 hours.',
  },
  {
    key: 'at-risk',
    label: 'At Risk',
    range: '< 50%',
    color: 'bg-rose-500',
    ring: 'ring-rose-500/40',
    border: 'border-rose-500/50',
    glow: 'shadow-rose-500/20',
    textColor: 'text-rose-400',
    bgLight: 'bg-rose-500/10',
    icon: Flame,
    badge: 'Critical Gap',
    meaning:
      'Critical knowledge gap. Mastery is severely degraded or the concept has never been practised. Downstream concepts depending on this topic are blocked or at high failure risk.',
    action: 'Remediate: take a diagnostic quiz immediately to identify gaps.',
  },
];

const NODE_INDICATORS = [
  {
    Icon: Flame,
    color: 'text-rose-400',
    bgIcon: 'bg-rose-500/20 border border-rose-500/30',
    label: 'Root Cause Gap',
    desc: 'This concept is the primary prerequisite bottleneck. At least one downstream topic has failed or is blocked specifically because this foundation is weak. Shown as a pulsing red badge on the node.',
  },
  {
    Icon: AlertTriangle,
    color: 'text-amber-400',
    bgIcon: 'bg-amber-500/20 border border-amber-500/30',
    label: 'Blocked Downstream',
    desc: "This concept cannot progress because a required prerequisite has not met the minimum mastery threshold (70%). It remains locked until its root gap is resolved.",
  },
  {
    Icon: CircleDot,
    color: 'text-teal-400',
    bgIcon: 'bg-teal-500/10 border border-teal-500/20',
    label: 'Dependency Arrow',
    desc: 'Arrows show prerequisite relationships flowing from source to dependent concept. You must reach sufficient mastery on the source before the target concept unlocks for full progression.',
  },
];

export default function GraphPage({ graphData, onSelectNode, selectedNodeId }) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-5 h-5 text-teal-400" />
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Curriculum Dependency Graph
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Interactive prerequisite network. Red glow highlights root bottlenecks; amber arrows
            indicate blocked learning pathways.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
          <Info className="w-4 h-4 text-teal-400" />
          <span>Click any concept to open the Prerequisite &amp; Impact Inspector.</span>
        </div>
      </div>

      {/* Living Knowledge Graph */}
      <div className="w-full h-[620px]">
        <KnowledgeGraph
          graphData={graphData}
          onSelectNode={onSelectNode}
          selectedNodeId={selectedNodeId}
        />
      </div>

      {/* ================================================================ */}
      {/* Colour Legend & Stability Score Guide                             */}
      {/* ================================================================ */}
      <div className="space-y-5">

        {/* Section divider title */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            Colour Legend &amp; Stability Score Guide
          </div>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* ── 1. Stability Level Cards ────────────────────────────────── */}
        <div>
          <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-3 pl-1">
            Node Border Colour = Mastery Stability Band
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {STABILITY_LEVELS.map((lvl) => {
              const Icon = lvl.icon;
              return (
                <div
                  key={lvl.key}
                  className={`rounded-2xl border ${lvl.border} ${lvl.bgLight} p-4 space-y-3`}
                >
                  {/* Colour swatch + label + range */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${lvl.color} shadow-lg ${lvl.glow} shrink-0`}
                      />
                      <span className={`font-extrabold text-sm ${lvl.textColor}`}>
                        {lvl.label}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg ${lvl.bgLight} border ${lvl.border} font-mono text-[11px] font-bold ${lvl.textColor}`}
                    >
                      {lvl.range}
                    </span>
                  </div>

                  {/* State badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60`}>
                    <Icon className={`w-3.5 h-3.5 ${lvl.textColor}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${lvl.textColor}`}>
                      {lvl.badge}
                    </span>
                  </div>

                  {/* Meaning */}
                  <p className="text-slate-400 text-[11px] leading-relaxed">{lvl.meaning}</p>

                  {/* Action */}
                  <div className={`flex items-start gap-1.5 pt-2 border-t border-slate-800/60`}>
                    <ArrowRight className={`w-3 h-3 mt-0.5 shrink-0 ${lvl.textColor}`} />
                    <p className={`text-[11px] font-semibold ${lvl.textColor}`}>{lvl.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. Score Detection Bar ───────────────────────────────────── */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">
            Mastery Score Detection Scale — How Each % Maps to a Stability Level
          </p>

          {/* Gradient bar */}
          <div>
            <div className="w-full h-6 rounded-xl overflow-hidden flex text-[10px] font-black">
              {/* At Risk: 0-49% = 49 units */}
              <div
                className="bg-rose-500 flex items-center justify-center text-white"
                style={{ width: '49%' }}
              >
                <span className="hidden sm:block">0 – 49% &nbsp;·&nbsp; At Risk</span>
                <span className="sm:hidden">0-49%</span>
              </div>
              {/* Weakening: 50-69% = 20 units */}
              <div
                className="bg-amber-400 flex items-center justify-center text-slate-950"
                style={{ width: '20%' }}
              >
                <span className="hidden sm:block">50 – 69%</span>
                <span className="sm:hidden">50-69%</span>
              </div>
              {/* Stable: 70-84% = 15 units */}
              <div
                className="bg-blue-400 flex items-center justify-center text-white"
                style={{ width: '15%' }}
              >
                <span className="hidden sm:block">70 – 84%</span>
                <span className="sm:hidden">70-84%</span>
              </div>
              {/* Strong: 85-100% = 16 units */}
              <div
                className="bg-emerald-400 flex-1 flex items-center justify-center text-slate-950"
              >
                <span className="hidden sm:block">85 – 100% &nbsp;·&nbsp; Strong</span>
                <span className="sm:hidden">85-100%</span>
              </div>
            </div>

            {/* Tick marks */}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5 px-0.5">
              <span>0%</span>
              <span className="translate-x-[10%]">50%</span>
              <span className="translate-x-[25%]">70%</span>
              <span className="translate-x-[40%]">85%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Compact colour key row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
            {STABILITY_LEVELS.map((lvl) => (
              <div key={lvl.key} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full shrink-0 ${lvl.color}`} />
                <div>
                  <p className={`text-[11px] font-bold ${lvl.textColor} leading-none`}>{lvl.label}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{lvl.range}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Node Badge & Edge Guide ───────────────────────────────── */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">
            Node Badges &amp; Dependency Edge Indicators
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {NODE_INDICATORS.map((ind, idx) => {
              const { Icon } = ind;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/60"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ind.bgIcon}`}>
                    <Icon className={`w-4 h-4 ${ind.color}`} />
                  </div>
                  <div className="space-y-1.5">
                    <p className={`text-[11px] font-bold ${ind.color}`}>{ind.label}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{ind.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. How to Read the Graph ─────────────────────────────────── */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
          <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-4">
            How to Read the Curriculum Dependency Graph
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {[
              ['Arrow direction', 'flows from prerequisite concept to the dependent concept (left to right).'],
              ['Node border colour', 'reflects the mastery stability band: green, blue, amber, or red.'],
              ['Progress bar (inside node)', 'shows the exact estimated mastery percentage for that concept.'],
              ['Pulsing red "Root Cause Gap" badge', 'marks the primary bottleneck blocking downstream topics.'],
              ['Amber "Blocked Downstream" badge', 'marks concepts that cannot advance until the root gap is fixed.'],
              ['Click any node', 'to open the full Prerequisite & Impact Inspector with chain analysis.'],
              ['MiniMap (bottom-right)', 'uses the same colour system for a bird-eye structural overview.'],
              ['Scroll to zoom / drag to pan', 'navigate across the full ontology at any detail level.'],
            ].map(([term, desc], i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-teal-400" />
                <span>
                  <span className="font-bold text-teal-300">{term}:</span>{' '}
                  <span className="text-slate-400">{desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
