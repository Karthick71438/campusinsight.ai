import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle, Clock, Layers, Flame, CheckCircle } from 'lucide-react';
import MasteryBadge from './MasteryBadge';

function ConceptNode({ data, selected }) {
  const {
    name,
    mastery_score,
    stability,
    days_since_practice,
    is_root_gap,
    is_impacted,
  } = data;

  const isUnattempted = data.assessed === false || stability === 'Unattempted' || (!stability && !mastery_score);

  const haloClass = isUnattempted
    ? 'border-slate-700/90 shadow-slate-900/40 hover:border-slate-600'
    : {
        Strong: 'halo-strong border-emerald-500/60 shadow-emerald-500/20',
        Stable: 'halo-stable border-blue-500/60 shadow-blue-500/20',
        Weakening: 'halo-weakening border-amber-500/70 shadow-amber-500/30',
        'At Risk': 'halo-at-risk border-rose-500/80 shadow-rose-500/40',
      }[stability] || 'border-slate-700';

  const progressBg = {
    Strong: 'bg-emerald-400',
    Stable: 'bg-blue-400',
    Weakening: 'bg-amber-400',
    'At Risk': 'bg-rose-500',
  }[stability] || 'bg-slate-500';

  return (
    <div
      className={`relative min-w-[210px] rounded-xl bg-slate-900/95 border-2 p-3.5 shadow-xl transition-all duration-300 backdrop-blur-md cursor-pointer ${haloClass} ${
        selected ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950 scale-105' : 'hover:scale-[1.02]'
      }`}
    >
      {/* React Flow Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-950 transition-all hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-950 transition-all hover:scale-125"
      />

      {/* Critical Flag Banners */}
      {!isUnattempted && is_root_gap && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold tracking-wider uppercase shadow-lg shadow-rose-500/50 flex items-center gap-1 animate-bounce">
          <Flame className="w-3 h-3 text-yellow-300" />
          Root Cause Gap
        </div>
      )}

      {!isUnattempted && is_impacted && !is_root_gap && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-500/90 text-slate-950 font-mono text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-slate-950" />
          Blocked Downstream
        </div>
      )}

      {/* Node Header */}
      <div className="flex items-start justify-between gap-2 mt-1">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
            {data.unit || 'Syllabus Topic'}
          </span>
          <h4 className="font-bold text-slate-100 text-sm tracking-tight">{name}</h4>
        </div>
        {isUnattempted ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Unattempted
          </span>
        ) : (
          <MasteryBadge stability={stability} score={mastery_score} showScore={false} />
        )}
      </div>

      {/* Progress Bar & Numerical Score */}
      <div className="mt-3">
        {isUnattempted ? (
          <div className="py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Diagnostic Status</span>
            <span className="font-mono text-[10px] font-semibold text-amber-300/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Quiz Pending
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 text-[11px] font-medium">Estimated Mastery</span>
              <span className="font-mono font-bold text-slate-200">{Math.round(mastery_score)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={`h-full transition-all duration-700 rounded-full ${progressBg}`}
                style={{ width: `${Math.max(4, Math.min(100, mastery_score))}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Node Footer: Practice Gap */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3 text-slate-500" />
          {isUnattempted
            ? 'Not Yet Assessed'
            : days_since_practice !== null && days_since_practice !== undefined
            ? `${days_since_practice}d gap`
            : 'Unpracticed'}
        </span>
        <span className={`text-[10px] font-semibold cursor-pointer ${isUnattempted ? 'text-teal-400 hover:text-teal-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          {isUnattempted ? 'Attend Quiz →' : 'Inspect →'}
        </span>
      </div>
    </div>
  );
}

export default memo(ConceptNode);
