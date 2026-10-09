import React, { useState, useRef, useEffect } from 'react';
import {
  Network,
  LayoutDashboard,
  Compass,
  GitBranch,
  TrendingDown,
  BookOpen,
  User,
  LogIn,
  LogOut,
  HelpCircle,
  Sun,
  Moon,
  Zap,
  Users,
  MessageSquare,
  ChevronDown,
  GraduationCap,
  Hash,
  Menu,
  X,
} from 'lucide-react';
import { getStudentProfile, MENTOR_PROFILE as DEFAULT_MENTOR } from '../data/studentProfiles';

// ─── Nav button — used for desktop AND mobile ─────────────────────────────────
function NavBtn({ tab, isActive, onClick, compact = false }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(tab.id)}
      title={tab.label}
      className={`
        flex items-center gap-1.5 whitespace-nowrap font-semibold
        transition-all duration-150 cursor-pointer shrink-0
        ${compact
          ? 'px-2.5 py-1.5 rounded-lg text-[11px]'
          : 'px-3 py-2 rounded-xl text-xs'
        }
        ${isActive
          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-transparent'
        }
      `}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{compact ? tab.main : tab.label}</span>
    </button>
  );
}

// ─── Thin vertical divider ────────────────────────────────────────────────────
function Divider() {
  return <div className="w-px h-5 bg-slate-700/70 shrink-0" />;
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar({
  activeTab,
  onSelectTab,
  activeStudentId,
  onSelectStudent,
  currentStudent,
  onOpenAuth,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  activeMode = 'student',
  onSwitchMode,
  mentorProfile,
}) {
  const mentor = mentorProfile || DEFAULT_MENTOR;
  const activeSP = getStudentProfile(activeStudentId || 'student-demo-1');

  // Student navigation items
  const studentTabs = [
    { id: 'faculty',     label: 'Student Map',      main: 'Student Map',   icon: LayoutDashboard },
    { id: 'graph',       label: 'Knowledge Graph',  main: 'K. Graph',      icon: GitBranch },
    { id: 'decay',       label: 'Decay Tracker',    main: 'Decay',         icon: TrendingDown },
    { id: 'roadmap',     label: 'Roadmap',          main: 'Roadmap',       icon: Compass },
    { id: 'quiz',        label: 'Quiz',             main: 'Quiz',          icon: BookOpen },
    { id: 'brain-blast', label: 'Brain Blast',      main: 'Brain Blast',   icon: Zap },
    { id: 'help',        label: 'Help & Support',   main: 'Help',          icon: HelpCircle },
  ];

  // Mentor navigation (informational labels only — MentorDashboardPage handles its own routing)
  const mentorTabs = [
    { id: 'progress', label: 'Student Progress',     main: 'Student Progress',     icon: Users },
    { id: 'feedback', label: 'Feedback for Students', main: 'Feedback for Students', icon: MessageSquare },
  ];

  const activeTabs = activeMode === 'mentor' ? mentorTabs : studentTabs;

  // Profile switcher dropdown
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef(null);

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [activeTab, activeMode]);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/98 border-b border-slate-800/80 backdrop-blur-xl">
      <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-6">

        {/*
          ─────────────────────────────────────────────────────────────────────
          Desktop row: Logo | [spacer] | Nav | [spacer] | Right actions
          We use a 3-column grid so the center nav never overlaps the sides.
          left  = fixed min-width for logo
          center = fills remaining space, scrollable if needed
          right  = fixed min-width for controls
          ─────────────────────────────────────────────────────────────────────
        */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center h-16 gap-6">

          {/* ── LEFT: Logo ─────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => activeMode === 'student' && onSelectTab('faculty')}
            className="flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 rounded-xl cursor-pointer group"
            title="CampusInsight AI"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 p-[3px] shadow-md shadow-teal-500/25 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                <Network className="w-4 h-4 text-teal-400" />
              </div>
            </div>
            <span className="font-extrabold text-base text-slate-100 tracking-tight whitespace-nowrap group-hover:text-teal-50 transition-colors">
              CampusInsight<span className="text-teal-400">.ai</span>
            </span>
          </button>

          {/* ── CENTER: Scrollable Nav ──────────────────────────────────── */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 px-2">
            {activeMode === 'mentor' ? (
              // Mentor: purely informational labels (routing is inside MentorDashboardPage)
              mentorTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <span
                    key={tab.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 whitespace-nowrap select-none"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {tab.label}
                  </span>
                );
              })
            ) : (
              studentTabs.map((tab) => (
                <NavBtn
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={onSelectTab}
                />
              ))
            )}
          </nav>

          {/* ── RIGHT: Controls ────────────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              aria-label="Toggle theme"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-teal-400" />
              }
            </button>

            <Divider />

            {/* Student profile button (student mode only) */}
            {activeMode === 'student' && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectTab('profile')}
                  title="My Profile"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    activeTab === 'profile'
                      ? 'bg-teal-500/15 text-teal-300 border-teal-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-teal-300 hover:bg-slate-800'
                  }`}
                >
                  <img
                    src={activeSP.photo}
                    alt={activeSP.name}
                    className="w-5 h-5 rounded-full border border-slate-700 object-cover shrink-0"
                  />
                  <span className="max-w-[72px] truncate">{activeSP.name}</span>
                </button>

                {/* Student switcher */}
                {!currentStudent && (
                  <select
                    value={activeStudentId}
                    onChange={(e) => onSelectStudent(e.target.value)}
                    title="Switch student"
                    className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none focus:border-slate-600 cursor-pointer transition-colors hover:border-slate-600 max-w-[90px]"
                  >
                    <option value="student-demo-1" className="bg-slate-900">Deepika</option>
                    <option value="student-demo-2" className="bg-slate-900">Kavya</option>
                    <option value="student-demo-3" className="bg-slate-900">Santhosh</option>
                    <option value="student-demo-4" className="bg-slate-900">Karthik</option>
                    <option value="student-demo-5" className="bg-slate-900">Mukesh</option>
                  </select>
                )}

                <Divider />
              </>
            )}

            {/* Role / Profile mode switcher */}
            <div className="relative shrink-0" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setShowSwitcher((v) => !v)}
                title="Switch profile mode"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === 'mentor'
                    ? 'bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/15'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {activeMode === 'mentor' ? (
                  <>
                    <img src={mentor.photo} alt={mentor.name} className="w-5 h-5 rounded-full border border-teal-500/40 object-cover shrink-0" />
                    <span className="font-bold text-teal-300">Mentor</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <span>Student</span>
                  </>
                )}
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${showSwitcher ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown panel */}
              {showSwitcher && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-68 min-w-[260px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                  <div className="px-4 py-2.5 border-b border-slate-800/80">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Switch Profile</p>
                  </div>

                  {/* Student option */}
                  <button
                    type="button"
                    onClick={() => { onSwitchMode('student'); setShowSwitcher(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-900/80 transition-colors cursor-pointer ${
                      activeMode === 'student' ? 'bg-slate-900/60' : ''
                    }`}
                  >
                    <img src={activeSP.photo} alt={activeSP.name} className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-100">{activeSP.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-teal-400 font-mono mt-0.5">
                        <Hash className="w-3 h-3 shrink-0" />{activeSP.rollNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Student Account</div>
                    </div>
                    {activeMode === 'student' && (
                      <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">Active</span>
                    )}
                  </button>

                  <div className="border-t border-slate-800/50" />

                  {/* Mentor option */}
                  <button
                    type="button"
                    onClick={() => { onSwitchMode('mentor'); setShowSwitcher(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-900/80 transition-colors cursor-pointer ${
                      activeMode === 'mentor' ? 'bg-teal-500/5' : ''
                    }`}
                  >
                    <img src={mentor.photo} alt={mentor.name} className="w-10 h-10 rounded-full border border-teal-500/30 object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-100">{mentor.name}</div>
                      <div className="text-[11px] text-teal-300/70 truncate mt-0.5">{mentor.designation}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Mentor Account</div>
                    </div>
                    {activeMode === 'mentor' && (
                      <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">Active</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Sign In / Logout (student mode only) */}
            {activeMode === 'student' && (
              <>
                <Divider />
                {currentStudent ? (
                  <button
                    onClick={onLogout}
                    title="Log out"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/20 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/*
          ─────────────────────────────────────────────────────────────────────
          Mobile row: Logo | [spacer] | Right mini-controls | Hamburger
          ─────────────────────────────────────────────────────────────────────
        */}
        <div className="md:hidden flex items-center justify-between h-14 gap-3">
          {/* Logo */}
          <button
            type="button"
            onClick={() => activeMode === 'student' && onSelectTab('faculty')}
            className="flex items-center gap-2 shrink-0 cursor-pointer"
            title="CampusInsight AI"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 p-[3px] shadow-md shadow-teal-500/25 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[5px] flex items-center justify-center">
                <Network className="w-3.5 h-3.5 text-teal-400" />
              </div>
            </div>
            <span className="font-extrabold text-sm text-slate-100 tracking-tight whitespace-nowrap">
              CampusInsight<span className="text-teal-400">.ai</span>
            </span>
          </button>

          {/* Mobile right: theme + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-teal-400" />
              }
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile expanded menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800/80 py-3 space-y-3">
            {/* Nav items */}
            <div className="flex flex-wrap gap-1.5 px-1">
              {activeTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const isClickable = activeMode === 'student';
                const Icon = tab.icon;
                return isClickable ? (
                  <button
                    key={tab.id}
                    onClick={() => { onSelectTab(tab.id); setMobileOpen(false); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {tab.main}
                  </button>
                ) : (
                  <span key={tab.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 bg-slate-900/60 border border-slate-800/60">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {tab.main}
                  </span>
                );
              })}
              {/* Profile tab (student mode) */}
              {activeMode === 'student' && (
                <button
                  onClick={() => { onSelectTab('profile'); setMobileOpen(false); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  Profile
                </button>
              )}
            </div>

            {/* Mobile controls row */}
            <div className="flex flex-wrap items-center gap-2 px-1 pt-1 border-t border-slate-800/60">
              {/* Student profile + switcher */}
              {activeMode === 'student' && (
                <>
                  <button
                    onClick={() => { onSelectTab('profile'); setMobileOpen(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    <img src={activeSP.photo} alt={activeSP.name} className="w-5 h-5 rounded-full border border-slate-700 object-cover" />
                    {activeSP.name}
                  </button>
                  {!currentStudent && (
                    <select
                      value={activeStudentId}
                      onChange={(e) => onSelectStudent(e.target.value)}
                      className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="student-demo-1" className="bg-slate-900">Deepika</option>
                      <option value="student-demo-2" className="bg-slate-900">Kavya</option>
                      <option value="student-demo-3" className="bg-slate-900">Santhosh</option>
                      <option value="student-demo-4" className="bg-slate-900">Karthik</option>
                      <option value="student-demo-5" className="bg-slate-900">Mukesh</option>
                    </select>
                  )}
                </>
              )}

              {/* Role switcher */}
              <button
                onClick={() => onSwitchMode(activeMode === 'student' ? 'mentor' : 'student')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  activeMode === 'mentor'
                    ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {activeMode === 'mentor'
                  ? <><img src={mentor.photo} alt="Mentor" className="w-4 h-4 rounded-full border border-teal-500/40 object-cover" /> Switch to Student</>
                  : <><GraduationCap className="w-4 h-4" /> Switch to Mentor</>
                }
              </button>

              {/* Auth button */}
              {activeMode === 'student' && (
                currentStudent ? (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold cursor-pointer shadow-md shadow-teal-500/20"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </button>
                )
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
