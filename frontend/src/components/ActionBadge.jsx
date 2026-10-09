import React from 'react';
import { Flame, Clock, Play, ArrowRight, Award } from 'lucide-react';

const ACTION_CONFIG = {
  REMEDIATE: {
    label: 'REMEDIATE ROOT CAUSE',
    desc: 'Foundational prerequisite gap impairs downstream learning',
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    icon: Flame,
  },
  REVIEW: {
    label: 'REVIEW DECAY',
    desc: 'Retention has declined over time; refresh memory trace',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    icon: Clock,
  },
  PRACTICE: {
    label: 'PRACTICE',
    desc: 'Active retrieval practice to build mastery confidence',
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    icon: Play,
  },
  ADVANCE: {
    label: 'ADVANCE',
    desc: 'Prerequisites met — unlocked and ready to learn',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    icon: ArrowRight,
  },
  CHALLENGE: {
    label: 'CHALLENGE',
    desc: 'High mastery achieved — test edge cases & synthesis',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    icon: Award,
  },
};

export default function ActionBadge({ actionType = 'PRACTICE', size = 'sm' }) {
  const config = ACTION_CONFIG[actionType?.toUpperCase()] || ACTION_CONFIG.PRACTICE;
  const Icon = config.icon;

  const sizeClasses = size === 'xs'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : size === 'lg'
    ? 'px-3.5 py-1.5 text-xs gap-2 font-bold'
    : 'px-2.5 py-1 text-[11px] gap-1.5 font-semibold';

  return (
    <span
      title={config.desc}
      className={`inline-flex items-center rounded-full border font-mono uppercase tracking-wider ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}
