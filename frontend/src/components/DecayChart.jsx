import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Clock, TrendingDown, Sparkles, AlertTriangle } from 'lucide-react';
import MasteryBadge from './MasteryBadge';

export default function DecayChart({ conceptDecay }) {
  if (!conceptDecay) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Select a concept to view its retention decay trajectory.
      </div>
    );
  }

  const {
    concept_name,
    current_mastery,
    peak_mastery,
    days_since_practice,
    stability,
    decay_curve = [],
    historical_points = [],
  } = conceptDecay;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs backdrop-blur-md">
          <div className="font-mono text-slate-400 font-bold mb-1">{data.label}</div>
          <div className="flex items-center gap-2">
            <span className="text-teal-400 font-medium">Estimated Retention:</span>
            <span className="font-mono font-bold text-slate-100">{data.projected_mastery.toFixed(1)}%</span>
          </div>
          {data.actual_mastery && (
            <div className="text-[11px] text-amber-400 mt-1 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Current Student State ({days_since_practice}d gap)
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const [chartMode, setChartMode] = React.useState('decay'); // 'decay' | 'progression'

  // Prepare progression data
  const progressionData = React.useMemo(() => {
    if (!historical_points || historical_points.length === 0) {
      return [{ label: 'Attempt 1', score: Math.round(current_mastery), attempt: 1 }];
    }
    return historical_points.map((hp, idx) => ({
      label: hp.label || `Attempt ${hp.attempt || idx + 1}`,
      score: hp.score != null ? Math.round(hp.score) : 0,
      attempt: hp.attempt || idx + 1,
      date: hp.date ? new Date(hp.date).toLocaleDateString() : '',
    }));
  }, [historical_points, current_mastery]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-slate-100">{concept_name}</h3>
            <MasteryBadge stability={stability} score={current_mastery} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {chartMode === 'decay'
              ? 'Retention trajectory modeled across time elapsed without deliberate practice.'
              : 'Empirical score progression across sequential diagnostic quiz attempts.'}
          </p>
        </div>

        {/* View Toggle & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {historical_points.length > 0 && (
            <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setChartMode('decay')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  chartMode === 'decay'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Decay Curve
              </button>
              <button
                type="button"
                onClick={() => setChartMode('progression')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMode === 'progression'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Attempt Progression</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/30 text-[10px] font-mono">
                  {historical_points.length}
                </span>
              </button>
            </div>
          )}

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Peak Verified</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{Math.round(peak_mastery)}%</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Estimated</span>
            <span className="text-sm font-bold font-mono text-amber-400">{Math.round(current_mastery)}%</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'decay' ? (
            <AreaChart data={decay_curve} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="decayGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Strong (85%)', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={70} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Stable (70%)', fill: '#3b82f6', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Weakening (50%)', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
              <Area
                type="monotone"
                dataKey="projected_mastery"
                stroke="#14b8a6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#decayGradient)"
              />
            </AreaChart>
          ) : (
            <AreaChart data={progressionData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
                        <div className="font-bold text-blue-300 font-mono mb-1">{item.label}</div>
                        <div className="text-slate-200">Score: <b className="text-emerald-400">{item.score}%</b></div>
                        {item.date && <div className="text-[11px] text-slate-400 mt-0.5">{item.date}</div>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Mastery (85%)', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={70} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Passing (70%)', fill: '#3b82f6', fontSize: 10, position: 'insideTopRight' }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#progressionGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Interpretation */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {chartMode === 'decay' ? (
            <>
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <span>
                Knowledge decay is an <strong>estimated learning signal</strong> based on practice gaps, not a fixed biological verdict.
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>
                Real attempt progression logged from consecutive diagnostic quiz assessments for <strong>{concept_name}</strong>.
              </span>
            </>
          )}
        </div>
        <div className="font-mono text-slate-400">
          {chartMode === 'decay' ? 'Decay Factor: S = 24.0d' : `${progressionData.length} Attempt${progressionData.length === 1 ? '' : 's'} Recorded`}
        </div>
      </div>
    </div>
  );
}
