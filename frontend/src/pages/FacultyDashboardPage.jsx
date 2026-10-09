import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  CalendarCheck,
  Award,
  FileText,
  TrendingUp,
  BarChart3,
  UserCheck,
  Activity,
  BarChart2,
  TrendingDown,
  Download,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  Legend,
} from 'recharts';
import {
  STUDENT_PROFILES,
  COHORT_KPIS,
  getStudentProfile,
} from '../data/studentProfiles';

// ─── Shared tooltip style ─────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: '#020617',
  borderColor: '#334155',
  borderRadius: '12px',
  fontSize: '12px',
};

// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const map = {
    Critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    High:     'bg-amber-500/20 text-amber-300 border-amber-500/40',
    Moderate: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    Low:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${map[level] ?? map.Low}`}>
      {level === 'Low' ? 'Low Risk' : level}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, borderClass, note, pulse }) {
  return (
    <div className={`p-5 rounded-2xl bg-slate-900/80 border shadow-lg backdrop-blur-md relative overflow-hidden ${borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${colorClass}`}>{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${colorClass}`} />}
      </div>
      <div className={`text-3xl font-extrabold font-mono ${colorClass}`}>{value}</div>
      {note && <span className="text-[11px] text-slate-500 mt-1 block">{note}</span>}
      {pulse && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
      )}
    </div>
  );
}

// ─── Chart Type Toggle ────────────────────────────────────────────────────────
function ChartTypeToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-xl p-1">
      <button
        onClick={() => onChange('line')}
        title="Line chart"
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
          value === 'line'
            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <TrendingUp className="w-3 h-3" />
        Line
      </button>
      <button
        onClick={() => onChange('bar')}
        title="Bar chart"
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
          value === 'bar'
            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <BarChart2 className="w-3 h-3" />
        Bar
      </button>
    </div>
  );
}

// ─── Generic trend chart (renders Line or Bar based on chartType) ─────────────
function TrendChart({ data, dataKey, chartType, color, unit = '', refY, refLabel }) {
  const commonAxis = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
      <Tooltip
        contentStyle={TOOLTIP_STYLE}
        formatter={(val) => [`${val}${unit}`, dataKey]}
      />
      {refY && (
        <ReferenceLine
          y={refY}
          stroke="#f43f5e"
          strokeDasharray="4 4"
          label={{ value: refLabel ?? `${refY}`, fill: '#f43f5e', fontSize: 10, position: 'right' }}
        />
      )}
    </>
  );

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
          {commonAxis}
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default: line (with area fill)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
        {commonAxis}
        <Area
          type="monotone"
          dataKey={dataKey}
          fill={`${color}20`}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 4, fill: color }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FacultyDashboardPage({ activeStudentId }) {
  // Per-student profile (single source of truth from studentProfiles.js)
  const studentProfile = getStudentProfile(activeStudentId || 'student-demo-1');

  // Independent chart-type state for each of the 3 trend charts
  const [attendanceChartType, setAttendanceChartType] = useState('line');
  const [assessmentChartType, setAssessmentChartType] = useState('line');
  const [internalChartType, setInternalChartType] = useState('line');

  // PDF Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState('');

  const handleDownloadReport = async () => {
    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const response = await api.downloadProgressReport(activeStudentId || 'student-demo-1');

      let filename = `CampusInsight_Learning_Progress_Report_${(
        studentProfile.name || 'Student'
      ).replace(/\s+/g, '_')}.pdf`;
      const disposition =
        response?.headers?.['content-disposition'] ||
        response?.headers?.['Content-Disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadFilename(filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to download learning progress report:', err);
      setDownloadError(
        err?.response?.data?.detail ||
          'Failed to generate progress report. Please verify server connectivity.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const { stats } = studentProfile;

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
              Student Performance Dashboard
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live Data
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            CampusInsight <span className="text-teal-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            "From Student Data to Smarter Intervention." — Viewing:{' '}
            <span className="text-teal-300 font-semibold">{studentProfile.name}</span>
            <span className="ml-2 text-slate-500 text-xs font-mono">
              {studentProfile.department} · Year {studentProfile.year} · Sec {studentProfile.section}
            </span>
          </p>
        </div>

        {/* Action: 📄 Download Learning Progress Report */}
        <div className="shrink-0 flex flex-col items-start lg:items-end">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloading}
            className="group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-200 disabled:opacity-60 cursor-pointer active:scale-95"
            title="Download verified academic learning progress report in PDF format"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-slate-950" />
                <span>Download Learning Progress Report</span>
                <Download className="w-3.5 h-3.5 text-slate-950/70 group-hover:translate-y-0.5 transition-transform" />
              </>
            )}
          </button>
          <span className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>CampusInsight AI Academic PDF</span>
          </span>
        </div>
      </div>

      {/* ── Download Feedback ──────────────────────────────────────────── */}
      {downloadError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <span>{downloadError}</span>
          <button onClick={() => setDownloadError(null)} className="text-rose-400 hover:text-rose-200 font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {downloadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Report generated and downloaded: <b>{downloadFilename}</b></span>
        </div>
      )}

      {/* ── SECTION 1: Cohort KPI Cards (derived from COHORT_KPIS) ────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">
            Cohort Overview
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Students"
            value={COHORT_KPIS.total_students}
            icon={Users}
            colorClass="text-slate-300"
            borderClass="border-slate-800"
            note="Active enrollment"
          />
          <StatCard
            label="At-Risk Students"
            value={COHORT_KPIS.at_risk_students}
            icon={AlertTriangle}
            colorClass="text-rose-400"
            borderClass="border-rose-500/40"
            note={`${COHORT_KPIS.risk_rate_percentage}% of cohort flagged`}
            pulse={COHORT_KPIS.at_risk_students > 0}
          />
          <StatCard
            label="Avg Attendance"
            value={`${COHORT_KPIS.average_attendance}%`}
            icon={CalendarCheck}
            colorClass="text-teal-400"
            borderClass="border-teal-500/30"
            note="Threshold: 75% required"
          />
          <StatCard
            label="Avg Internal Marks"
            value={COHORT_KPIS.average_internal_marks}
            icon={Award}
            colorClass="text-blue-400"
            borderClass="border-blue-500/30"
            note="Mid-semester benchmarks"
          />
          <StatCard
            label="Avg Assessment"
            value={`${COHORT_KPIS.average_assignment_performance}%`}
            icon={FileText}
            colorClass="text-purple-400"
            borderClass="border-purple-500/30"
            note="Coursework submission"
          />
        </div>
      </div>

      {/* ── SECTION 2: Individual Student KPI Snapshot ───────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider font-mono">
            {studentProfile.name}'s Performance Snapshot
          </h2>
          <div className="ml-auto">
            <RiskBadge level={stats.riskLevel} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Attendance"
            value={`${stats.attendance}%`}
            icon={CalendarCheck}
            colorClass={stats.attendance < 75 ? 'text-rose-400' : 'text-teal-400'}
            borderClass={stats.attendance < 75 ? 'border-rose-500/40' : 'border-teal-500/30'}
            note={stats.attendance < 75 ? '⚠ Below 75% threshold' : '✓ Above threshold'}
          />
          <StatCard
            label="Assessment Score"
            value={`${stats.assessmentScore}%`}
            icon={Activity}
            colorClass={stats.assessmentScore < 50 ? 'text-amber-400' : 'text-emerald-400'}
            borderClass={stats.assessmentScore < 50 ? 'border-amber-500/30' : 'border-emerald-500/30'}
            note="Assignment & test scores"
          />
          <StatCard
            label="Internal Marks"
            value={stats.internalMarks}
            icon={Award}
            colorClass={stats.internalMarks < 50 ? 'text-rose-400' : 'text-blue-400'}
            borderClass={stats.internalMarks < 50 ? 'border-rose-500/40' : 'border-blue-500/30'}
            note="Mid-term performance"
          />
          <StatCard
            label="Assignment Score"
            value={`${stats.assignmentScore}%`}
            icon={FileText}
            colorClass={stats.assignmentScore < 60 ? 'text-amber-400' : 'text-purple-400'}
            borderClass={stats.assignmentScore < 60 ? 'border-amber-500/30' : 'border-purple-500/30'}
            note="Coursework completion"
          />
          <StatCard
            label="CGPA"
            value={stats.cgpa}
            icon={TrendingUp}
            colorClass={stats.cgpa < 6 ? 'text-rose-400' : 'text-emerald-400'}
            borderClass={stats.cgpa < 6 ? 'border-rose-500/40' : 'border-emerald-500/30'}
            note="Cumulative grade avg"
          />
        </div>
      </div>

      {/* ── SECTION 3: Three Trend Charts (with independent chart switchers) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Attendance Trend ──────────────────────────────────────────────── */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-teal-400" />
              Attendance Trend
            </h2>
            <ChartTypeToggle value={attendanceChartType} onChange={setAttendanceChartType} />
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            Monthly attendance — <span className="text-teal-300 font-semibold">{studentProfile.name}</span>
          </p>
          <div className="h-52 w-full">
            <TrendChart
              data={studentProfile.attendanceTrend}
              dataKey="attendance"
              chartType={attendanceChartType}
              color="#14b8a6"
              unit="%"
              refY={75}
              refLabel="75%"
            />
          </div>
        </div>

        {/* ── Assessment Trend ──────────────────────────────────────────────── */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Assessment Trend
            </h2>
            <ChartTypeToggle value={assessmentChartType} onChange={setAssessmentChartType} />
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            Monthly assessment scores — <span className="text-emerald-300 font-semibold">{studentProfile.name}</span>
          </p>
          <div className="h-52 w-full">
            <TrendChart
              data={studentProfile.assessmentTrend}
              dataKey="assessment"
              chartType={assessmentChartType}
              color="#10b981"
              unit="%"
              refY={50}
              refLabel="50%"
            />
          </div>
        </div>

        {/* ── Internal Performance Trend ────────────────────────────────────── */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Internal Performance Trend
            </h2>
            <ChartTypeToggle value={internalChartType} onChange={setInternalChartType} />
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            Monthly internal marks — <span className="text-blue-300 font-semibold">{studentProfile.name}</span>
          </p>
          <div className="h-52 w-full">
            <TrendChart
              data={studentProfile.internalTrend}
              dataKey="marks"
              chartType={internalChartType}
              color="#3b82f6"
              unit="/100"
              refY={50}
              refLabel="50"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Subject-wise Performance Breakdown ────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Subject-wise Performance Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Internal Marks, Attendance &amp; Assessment by course —{' '}
              <span className="text-blue-300 font-semibold">{studentProfile.name}</span>
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={studentProfile.subjectPerformance}
              margin={{ top: 10, right: 10, bottom: 20, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} interval={0} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="internal_marks"  name="Internal Marks"  fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attendance"      name="Attendance %"    fill="#14b8a6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assignment_score" name="Assessment %"   fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
