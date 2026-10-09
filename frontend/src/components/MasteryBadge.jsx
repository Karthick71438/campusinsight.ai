import React from 'react';
import { CheckCircle2, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function MasteryBadge({ stability, score, showScore = true }) {
  const configs = {
    Strong: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
      icon: CheckCircle2,
      label: 'Strong',
    },
    Stable: {
      bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      dot: 'bg-blue-400',
      icon: ShieldCheck,
      label: 'Stable',
    },
    Weakening: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
      icon: AlertTriangle,
      label: 'Weakening',
    },
    'At Risk': {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      icon: AlertOctagon,
      label: 'At Risk',
    },
  };

  const current = configs[stability] || configs['At Risk'];
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${current.bg}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{current.label}</span>
      {showScore && typeof score === 'number' && (
        <span className="opacity-90 font-mono text-[11px]">({Math.round(score)}%)</span>
      )}
    </span>
  );
}
