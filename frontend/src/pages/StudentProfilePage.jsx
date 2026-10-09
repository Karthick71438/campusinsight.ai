import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  Hash,
  Building2,
  Calendar,
  Mail,
  Camera,
  Upload,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Shield,
  BookOpen,
  Award,
  Activity,
  CalendarCheck,
  FileText,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import {
  getStudentProfile,
  updateStudentPhoto,
  resetStudentPhoto,
  getStudentFeedback,
  MENTOR_PROFILE,
} from '../data/studentProfiles';

// ─── Risk Badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const map = {
    Critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    High: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    Moderate: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
  const icons = {
    Critical: <AlertTriangle className="w-3 h-3" />,
    High: <AlertTriangle className="w-3 h-3" />,
    Moderate: <Shield className="w-3 h-3" />,
    Low: <CheckCircle2 className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${map[level] ?? map.Low}`}>
      {icons[level]}
      {level === 'Low' ? 'Low Risk' : level}
    </span>
  );
}

// ─── Stat Mini Card ──────────────────────────────────────────────────────────
function MiniStat({ label, value, colorClass, note }) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
      <div className={`text-2xl font-black font-mono ${colorClass}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{label}</div>
      {note && <div className="text-[10px] text-slate-500 mt-0.5">{note}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentProfilePage({ activeStudentId }) {
  const profile = getStudentProfile(activeStudentId || 'student-demo-1');
  const { stats } = profile;

  const [currentPhoto, setCurrentPhoto] = useState(profile.photo);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileInputRef = useRef(null);

  // Sync photo if it changes (e.g. from another tab or custom event)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.studentId === profile.id) {
        setCurrentPhoto(e.detail.photo || getStudentProfile(profile.id).photo);
      }
    };
    window.addEventListener('student-photo-updated', handler);
    return () => window.removeEventListener('student-photo-updated', handler);
  }, [profile.id]);

  // Refresh photo when student switches
  useEffect(() => {
    setCurrentPhoto(getStudentProfile(activeStudentId || 'student-demo-1').photo);
  }, [activeStudentId]);

  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadMsg('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadMsg('Image must be smaller than 5 MB.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      updateStudentPhoto(profile.id, dataUrl);
      setCurrentPhoto(dataUrl);
      setUploadMsg('Profile photo updated!');
      setUploading(false);
      setTimeout(() => setUploadMsg(''), 3000);
    };
    reader.onerror = () => {
      setUploadMsg('Failed to read image.');
      setUploading(false);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [profile.id]);

  const handleResetPhoto = () => {
    resetStudentPhoto(profile.id);
    setCurrentPhoto(getStudentProfile(profile.id).photo);
    setUploadMsg('Reset to default avatar.');
    setTimeout(() => setUploadMsg(''), 2500);
  };

  // Fetch mentor feedback for this student
  const feedbackList = getStudentFeedback(profile.id);
  const latestFeedback = feedbackList?.[0] ?? null;

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
            Student Profile
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
            {profile.name}'s <span className="text-teal-400">Profile</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Your academic identity and performance summary.
          </p>
        </div>
        <RiskBadge level={stats.riskLevel} />
      </div>

      {/* ── Profile Card ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Avatar + Upload */}
        <div className="lg:col-span-1 flex flex-col items-center p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md gap-5">
          {/* Avatar */}
          <div className="relative group">
            <img
              src={currentPhoto}
              alt={profile.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-teal-500/40 shadow-lg shadow-teal-500/10"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              title="Change profile photo"
            >
              <Camera className="w-8 h-8 text-teal-300" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {/* Name & Roll */}
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-100">{profile.name}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-teal-400 font-mono text-sm font-semibold">
              <Hash className="w-3.5 h-3.5" />
              <span>{profile.rollNumber}</span>
            </div>
          </div>

          {/* Photo Actions */}
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload New Photo'}
            </button>
            <button
              onClick={handleResetPhoto}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </button>
          </div>

          {uploadMsg && (
            <p className="text-xs text-center font-semibold text-emerald-400 animate-pulse">{uploadMsg}</p>
          )}
        </div>

        {/* Academic Info */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
            Academic Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Roll Number */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Hash className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Roll Number</p>
                <p className="text-sm font-bold text-teal-300 font-mono">{profile.rollNumber}</p>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Department</p>
                <p className="text-sm font-semibold text-slate-200">{profile.department}</p>
              </div>
            </div>

            {/* Year & Section */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Year & Section</p>
                <p className="text-sm font-semibold text-slate-200">Year {profile.year} · Section {profile.section}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Email</p>
                <p className="text-sm font-semibold text-slate-200">{profile.email}</p>
              </div>
            </div>

            {/* CGPA */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">CGPA</p>
                <p className="text-sm font-bold text-emerald-300">{stats.cgpa} / 10.0</p>
              </div>
            </div>

            {/* Risk Level */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Risk Status</p>
                <RiskBadge level={stats.riskLevel} />
              </div>
            </div>
          </div>

          {/* Mentor Info */}
          <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-teal-500/20 flex items-center gap-3">
            <img
              src={MENTOR_PROFILE.photo}
              alt={MENTOR_PROFILE.name}
              className="w-9 h-9 rounded-full border border-teal-500/30 shrink-0"
            />
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Assigned Mentor</p>
              <p className="text-sm font-bold text-teal-300">{MENTOR_PROFILE.name}</p>
              <p className="text-[11px] text-slate-400">{MENTOR_PROFILE.designation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress Summary ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-400" />
          Performance Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat
            label="Attendance"
            value={`${stats.attendance}%`}
            colorClass={stats.attendance < 75 ? 'text-rose-400' : 'text-teal-400'}
            note={stats.attendance < 75 ? '⚠ Below 75%' : '✓ Above threshold'}
          />
          <MiniStat
            label="Assessment"
            value={`${stats.assessmentScore}%`}
            colorClass={stats.assessmentScore < 50 ? 'text-amber-400' : 'text-emerald-400'}
            note="Quiz & test scores"
          />
          <MiniStat
            label="Internals"
            value={`${stats.internalMarks}`}
            colorClass={stats.internalMarks < 50 ? 'text-rose-400' : 'text-blue-400'}
            note="Mid-term marks"
          />
          <MiniStat
            label="CGPA"
            value={stats.cgpa}
            colorClass={stats.cgpa < 6 ? 'text-rose-400' : 'text-emerald-400'}
            note="Cumulative grade avg"
          />
        </div>
      </div>

      {/* ── Summary & Insights ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary */}
        {profile.summary && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-teal-400" />
              Academic Summary
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{profile.summary}</p>
          </div>
        )}

        {/* Mentor Feedback */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-teal-500/20 shadow-lg backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
            <Edit3 className="w-4 h-4 text-teal-400" />
            Latest Mentor Feedback
          </h3>
          {latestFeedback ? (
            <div>
              <p className="text-sm text-slate-300 leading-relaxed italic">"{latestFeedback.text}"</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-teal-400">{latestFeedback.mentorName}</span>
                <span>·</span>
                <span>{new Date(latestFeedback.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No mentor feedback yet.</p>
          )}
        </div>
      </div>

      {/* ── Improvements ──────────────────────────────────────────────────── */}
      {profile.improvements?.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-lg">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {profile.improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 mt-0.5 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
