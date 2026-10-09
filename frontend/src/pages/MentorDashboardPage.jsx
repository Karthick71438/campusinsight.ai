import React, { useState, useRef, useCallback } from 'react';
import {
  Users,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Hash,
  Building2,
  Calendar,
  FileText,
  TrendingUp,
  Activity,
  Award,
  CalendarCheck,
  BarChart3,
  MessageSquare,
  Send,
  Trash2,
  UserCheck,
  TrendingDown,
  BarChart2,
  Edit3,
} from 'lucide-react';
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
  MENTOR_PROFILE,
  getStudentProfile,
  getStudentByRollNumber,
  getStudentFeedback,
  saveStudentFeedback,
} from '../data/studentProfiles';
import { api } from '../services/api';

// ─── Tooltip style ────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: '#020617',
  borderColor: '#334155',
  borderRadius: '12px',
  fontSize: '12px',
};

// ─── Risk Badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const map = {
    Critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    High: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    Moderate: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${map[level] ?? map.Low}`}>
      {level === 'Low' ? 'Low Risk' : level}
    </span>
  );
}

// ─── Chart Type Toggle ────────────────────────────────────────────────────────
function ChartTypeToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-xl p-1">
      <button
        onClick={() => onChange('line')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
          value === 'line'
            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <TrendingUp className="w-3 h-3" /> Line
      </button>
      <button
        onClick={() => onChange('bar')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
          value === 'bar'
            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <BarChart2 className="w-3 h-3" /> Bar
      </button>
    </div>
  );
}

// ─── Generic Trend Chart ──────────────────────────────────────────────────────
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

// ─── Student Card (in list view) ─────────────────────────────────────────────
function StudentCard({ profile, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(profile)}
      className="w-full text-left p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 hover:bg-slate-900 shadow-lg backdrop-blur-md transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <img
          src={getStudentProfile(profile.id).photo}
          alt={profile.name}
          className="w-14 h-14 rounded-full border-2 border-slate-700 group-hover:border-teal-500/50 transition-colors object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-100 text-base">{profile.name}</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-teal-400 font-mono font-semibold mt-0.5">
                <Hash className="w-3 h-3" />
                <span>{profile.rollNumber}</span>
              </div>
            </div>
            <RiskBadge level={profile.stats.riskLevel} />
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Year {profile.year} · Sec {profile.section}
            </span>
            <span className="flex items-center gap-1">
              <CalendarCheck className="w-3 h-3" />
              Attendance: <span className={`font-semibold ml-0.5 ${profile.stats.attendance < 75 ? 'text-rose-400' : 'text-teal-400'}`}>{profile.stats.attendance}%</span>
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              CGPA: <span className="font-semibold ml-0.5 text-emerald-400">{profile.stats.cgpa}</span>
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-teal-400 transition-colors shrink-0" />
      </div>
    </button>
  );
}

// ─── Individual Student Progress View ────────────────────────────────────────
function StudentProgressDetail({ profile: rawProfile, onBack }) {
  const profile = getStudentProfile(rawProfile.id);
  const { stats } = profile;
  const [attChart, setAttChart] = useState('line');
  const [assChart, setAssChart] = useState('line');
  const [intChart, setIntChart] = useState('line');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);
    try {
      const response = await api.downloadProgressReport(profile.id);
      let filename = `CampusInsight_Progress_${profile.name.replace(/\s+/g, '_')}_${profile.rollNumber}.pdf`;
      const disposition = response?.headers?.['content-disposition'] || response?.headers?.['Content-Disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setDownloadFilename(filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      setDownloadError(err?.response?.data?.detail || 'Failed to generate PDF. Check server connection.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to All Students
          </button>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Download Progress Report */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-60 cursor-pointer active:scale-95"
          >
            {downloading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="w-3.5 h-3.5" /> Download Progress Report <Download className="w-3 h-3 opacity-70" /></>
            )}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <span>{downloadError}</span>
          <button onClick={() => setDownloadError(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /><span>Downloaded: <b>{downloadFilename}</b></span>
        </div>
      )}

      {/* Student Identity Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-5">
          <img
            src={profile.photo}
            alt={profile.name}
            className="w-20 h-20 rounded-full border-3 border-teal-500/40 shadow-lg object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-100">{profile.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 font-mono text-teal-400 text-sm font-bold">
                    <Hash className="w-3.5 h-3.5" />{profile.rollNumber}
                  </div>
                  <span className="text-slate-600">·</span>
                  <span className="text-sm text-slate-400">{profile.department}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Year {profile.year} · Section {profile.section}</div>
              </div>
              <RiskBadge level={stats.riskLevel} />
            </div>
            {/* KPI summary row */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              <span className={`font-bold ${stats.attendance < 75 ? 'text-rose-400' : 'text-teal-400'}`}>
                Attendance: {stats.attendance}%
              </span>
              <span className="font-bold text-emerald-400">Assessment: {stats.assessmentScore}%</span>
              <span className={`font-bold ${stats.internalMarks < 50 ? 'text-rose-400' : 'text-blue-400'}`}>
                Internals: {stats.internalMarks}
              </span>
              <span className="font-bold text-purple-400">CGPA: {stats.cgpa}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-teal-400" /> Attendance Trend
            </h3>
            <ChartTypeToggle value={attChart} onChange={setAttChart} />
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Monthly — <span className="text-teal-300 font-semibold">{profile.name}</span></p>
          <div className="h-44 w-full">
            <TrendChart data={profile.attendanceTrend} dataKey="attendance" chartType={attChart} color="#14b8a6" unit="%" refY={75} refLabel="75%" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Assessment Trend
            </h3>
            <ChartTypeToggle value={assChart} onChange={setAssChart} />
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Monthly — <span className="text-emerald-300 font-semibold">{profile.name}</span></p>
          <div className="h-44 w-full">
            <TrendChart data={profile.assessmentTrend} dataKey="assessment" chartType={assChart} color="#10b981" unit="%" refY={50} refLabel="50%" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Internal Marks Trend
            </h3>
            <ChartTypeToggle value={intChart} onChange={setIntChart} />
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Monthly — <span className="text-blue-300 font-semibold">{profile.name}</span></p>
          <div className="h-44 w-full">
            <TrendChart data={profile.internalTrend} dataKey="marks" chartType={intChart} color="#3b82f6" unit="/100" refY={50} refLabel="50" />
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-md">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-blue-400" /> Subject-wise Performance Breakdown
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Internal Marks · Attendance · Assessment — <span className="text-blue-300 font-semibold">{profile.name}</span>
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profile.subjectPerformance} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} interval={0} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="internal_marks" name="Internal Marks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attendance" name="Attendance %" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assignment_score" name="Assessment %" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights & Improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profile.insights?.length > 0 && (
          <div className="p-5 rounded-2xl bg-teal-500/5 border border-teal-500/20 shadow-lg">
            <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" /> Key Insights
            </h3>
            <ul className="space-y-2">
              {profile.insights.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-teal-400 mt-0.5 shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile.improvements?.length > 0 && (
          <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-lg">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" /> Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {profile.improvements.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-0.5 shrink-0">→</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Summary */}
      {profile.summary && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
          <h3 className="text-sm font-bold text-slate-300 mb-2">Academic Status Summary</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{profile.summary}</p>
        </div>
      )}
    </div>
  );
}

// ─── Student Progress Page (list + search) ────────────────────────────────────
function StudentProgressPage() {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const searchResult = search.trim() ? getStudentByRollNumber(search) : null;

  const displayList = search.trim()
    ? (searchResult ? [searchResult] : [])
    : STUDENT_PROFILES;

  if (selectedStudent) {
    return (
      <StudentProgressDetail
        profile={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
            Mentor Dashboard
          </span>
          <h2 className="text-2xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-400" />
            Student Progress
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitoring <span className="text-teal-300 font-bold">5 students</span> assigned to Dr. Arun Kumar
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-teal-500/30 text-sm font-bold text-teal-300">
          Total Students: <span className="text-2xl font-black text-teal-400">{STUDENT_PROFILES.length}</span>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Roll Number (e.g. CSBS001)..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-teal-500/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm text-slate-200 placeholder-slate-500 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search status */}
      {search.trim() && (
        <div className="text-xs text-slate-400 font-mono">
          {searchResult
            ? <>✓ Found: <span className="text-teal-400 font-bold">{searchResult.name}</span> ({searchResult.rollNumber})</>
            : <span className="text-rose-400">✗ No student found with roll number "<b>{search.trim().toUpperCase()}</b>"</span>}
        </div>
      )}

      {/* Student Cards */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No student found</p>
            <p className="text-xs mt-1">Try searching with a valid roll number like CSBS001</p>
          </div>
        ) : (
          displayList.map((profile) => (
            <StudentCard key={profile.id} profile={profile} onClick={setSelectedStudent} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Feedback for Students Page ───────────────────────────────────────────────
function FeedbackPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(STUDENT_PROFILES[0].id);
  const [feedbackText, setFeedbackText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [feedbacks, setFeedbacks] = useState(() => getStudentFeedback(STUDENT_PROFILES[0].id));

  const selectedProfile = getStudentProfile(selectedStudentId);

  const handleStudentChange = (id) => {
    setSelectedStudentId(id);
    setFeedbacks(getStudentFeedback(id));
    setFeedbackText('');
    setSaveMsg('');
  };

  const handleSave = () => {
    if (!feedbackText.trim()) return;
    setSaving(true);
    const updated = saveStudentFeedback(selectedStudentId, feedbackText);
    setFeedbacks(updated);
    setFeedbackText('');
    setSaveMsg('Feedback saved successfully!');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
          Mentor Dashboard
        </span>
        <h2 className="text-2xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-teal-400" />
          Feedback for Students
        </h2>
        <p className="text-sm text-slate-400 mt-1">Write and review mentor feedback for each student.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Select Student
          </h3>
          {STUDENT_PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => handleStudentChange(p.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                selectedStudentId === p.id
                  ? 'bg-teal-500/10 border-teal-500/50 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <img
                src={getStudentProfile(p.id).photo}
                alt={p.name}
                className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-100">{p.name}</div>
                <div className="text-[11px] font-mono text-teal-400">{p.rollNumber}</div>
              </div>
              <RiskBadge level={p.stats.riskLevel} />
            </button>
          ))}
        </div>

        {/* Feedback Panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Selected student info */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <img
              src={selectedProfile.photo}
              alt={selectedProfile.name}
              className="w-14 h-14 rounded-full border-2 border-teal-500/40 object-cover shrink-0"
            />
            <div>
              <h3 className="font-extrabold text-lg text-slate-100">{selectedProfile.name}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-teal-400 font-bold">{selectedProfile.rollNumber}</span>
                <span>·</span>
                <span>Year {selectedProfile.year}, Sec {selectedProfile.section}</span>
                <span>·</span>
                <RiskBadge level={selectedProfile.stats.riskLevel} />
              </div>
              <div className="flex gap-4 mt-1 text-[11px] text-slate-400">
                <span>Attendance: <span className={`font-bold ${selectedProfile.stats.attendance < 75 ? 'text-rose-400' : 'text-teal-400'}`}>{selectedProfile.stats.attendance}%</span></span>
                <span>CGPA: <span className="font-bold text-emerald-400">{selectedProfile.stats.cgpa}</span></span>
              </div>
            </div>
          </div>

          {/* Write feedback */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg space-y-3">
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-teal-400" />
              Write Feedback
            </h4>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={`Enter feedback for ${selectedProfile.name}...`}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-teal-500/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm text-slate-200 placeholder-slate-500 resize-none transition-all"
            />
            <div className="flex items-center justify-between gap-3">
              {saveMsg && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {saveMsg}
                </span>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setFeedbackText('')}
                  disabled={!feedbackText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
                <button
                  onClick={handleSave}
                  disabled={!feedbackText.trim() || saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-teal-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save Feedback
                </button>
              </div>
            </div>
          </div>

          {/* Previous feedback */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Previous Feedback ({feedbacks.length})
            </h4>
            {feedbacks.length === 0 ? (
              <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 text-sm text-slate-500 text-center">
                No feedback recorded yet.
              </div>
            ) : (
              feedbacks.map((fb, i) => (
                <div key={fb.id || i} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <p className="text-sm text-slate-300 leading-relaxed italic">"{fb.text}"</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-teal-400">{fb.mentorName}</span>
                    <span>·</span>
                    <span>{new Date(fb.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Mentor Dashboard Root ────────────────────────────────────────────────────
export default function MentorDashboardPage() {
  const [activeView, setActiveView] = useState('progress'); // 'progress' | 'feedback'

  const navItems = [
    { id: 'progress', label: 'Student Progress', icon: Users },
    { id: 'feedback', label: 'Feedback for Students', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Mentor Identity Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/80 to-slate-900/80 border border-teal-500/30 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img
            src={MENTOR_PROFILE.photo}
            alt={MENTOR_PROFILE.name}
            className="w-16 h-16 rounded-full border-2 border-teal-500/40 shadow-md shrink-0"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-100">{MENTOR_PROFILE.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold">
                Mentor
              </span>
            </div>
            <p className="text-sm text-teal-300/80 font-semibold mt-0.5">{MENTOR_PROFILE.designation}</p>
            <p className="text-xs text-slate-400 mt-0.5">{MENTOR_PROFILE.department} · {MENTOR_PROFILE.office}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black text-teal-400">{MENTOR_PROFILE.assignedStudentsCount}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Students Assigned</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-px ${
                isActive
                  ? 'text-teal-300 border-teal-400 bg-teal-500/5'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'progress' && <StudentProgressPage />}
      {activeView === 'feedback' && <FeedbackPage />}
    </div>
  );
}
