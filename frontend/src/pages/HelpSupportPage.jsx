import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  UploadCloud,
  Compass,
  BookOpen,
  Play,
  Award,
  GitBranch,
  TrendingDown,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock,
  ShieldCheck,
  Layers,
  FileText,
  Search,
  Zap,
  Bot,
  Brain,
  Download,
  Sun,
  Shield,
  MessageSquare,
  Send,
  LayoutDashboard,
} from 'lucide-react';

const GUIDE_STEPS = [
  {
    step: 1,
    id: 'login-profile',
    title: 'Account, Profiles & 5 Built-in Students',
    subtitle: 'Sign in, personalize your profile, or explore 5 demo student datasets',
    icon: User,
    accentColor: 'from-blue-500 to-cyan-500',
    badgeText: 'Step 1: Get Started',
    actionTab: 'faculty',
    actionLabel: 'Open Student Map',
    summary:
      'Log in with your Google account or institutional email. You can also test the platform using our 5 built-in student profiles with real academic analytics and toggle Light/Dark mode anytime.',
    keyPoints: [
      {
        title: 'Sign In or Continue with Google',
        desc: 'Click "Sign In / Register" in the top bar to log in. Your profile and learning progress stay saved across browser sessions.',
      },
      {
        title: '5 Built-in Demo Students',
        desc: 'Switch between Deepika, Kavya, Santhosh, Karthik, and Mukesh in the top switcher to instantly view individual student records.',
      },
      {
        title: 'Dark & Light Theme',
        desc: 'Click the Sun / Moon toggle in the top-right navbar to easily switch between dark mode and bright daytime reading mode.',
      },
    ],
    proTip:
      'Each of the 5 built-in students has unique attendance patterns, internal marks, and knowledge mastery levels!',
  },
  {
    step: 2,
    id: 'student-map',
    title: 'Student Map & Academic Analytics',
    subtitle: 'Track attendance, internal performance, and subject-wise breakdowns',
    icon: LayoutDashboard,
    accentColor: 'from-teal-500 to-emerald-500',
    badgeText: 'Step 2: Analytics Hub',
    actionTab: 'faculty',
    actionLabel: 'Go to Student Map',
    summary:
      'The Student Map displays dedicated analytics for the currently selected student, including Attendance Trends, Assessment Performance, and Subject-wise Breakdown.',
    keyPoints: [
      {
        title: 'Individual Student Data',
        desc: 'All charts reflect ONLY the selected student (e.g. Deepika, Kavya, etc.) without combining data across different learners.',
      },
      {
        title: 'Subject-wise Performance Breakdown',
        desc: 'View comprehensive scores across subjects to immediately identify areas of strength and subjects needing attention.',
      },
      {
        title: 'Faculty Intervention Status',
        desc: 'Students with significant attendance dips or test struggles are flagged for proactive academic mentoring and faculty intervention.',
      },
    ],
    proTip:
      'Click on any student in the top selector to watch all graphs update seamlessly to that student\'s individual record!',
  },
  {
    step: 3,
    id: 'download-pdf-report',
    title: 'Download Learning Progress Report (PDF)',
    subtitle: 'Generate an official multi-page progress report directly from Student Map',
    icon: Download,
    accentColor: 'from-emerald-400 to-teal-500',
    badgeText: 'Step 3: Verified PDF',
    actionTab: 'faculty',
    actionLabel: 'Download from Student Map',
    summary:
      'On the Student Map page, click "Download Learning Progress Report" to dynamically create a clean, comprehensive 10-section PDF report for the active student.',
    keyPoints: [
      {
        title: 'Located on Student Map',
        desc: 'Find the "Download Learning Progress Report" action button directly in the Student Map analytics overview.',
      },
      {
        title: '10 Comprehensive Sections',
        desc: 'Includes student details, academic overview, attendance trajectory, internal test scores, subject breakdown, and AI recommendations.',
      },
      {
        title: 'Official Academic Verification',
        desc: 'Each generated PDF report comes with official security verification stamps, timestamps, and personalized data.',
      },
    ],
    proTip:
      'Download the report before mentor reviews or parent-teacher check-ins for a complete academic snapshot!',
  },
  {
    step: 4,
    id: 'knowledge-graph',
    title: 'Living Knowledge Graph & Color Guide',
    subtitle: 'See how topics connect, prerequisite dependencies, and memory strength',
    icon: GitBranch,
    accentColor: 'from-teal-400 to-cyan-500',
    badgeText: 'Step 4: Dependency Graph',
    actionTab: 'graph',
    actionLabel: 'View Knowledge Graph',
    summary:
      'An interactive visual map showing how concepts connect. Arrows point from prerequisites to advanced topics, and node borders reflect real-time memory strength.',
    keyPoints: [
      {
        title: '4 Color Health Bands',
        desc: '🟢 Green (Strong, ≥85%): solid memory. 🔵 Blue (Stable, 70-84%): well understood. 🟡 Amber (Weakening, 50-69%): review soon. 🔴 Red (At Risk, <50%): needs practice.',
      },
      {
        title: 'Prerequisite Arrows (→)',
        desc: 'Arrows show which topic comes first. For example, mastering Functions before Recursion, and Recursion before Trees.',
      },
      {
        title: 'Root Cause Gap Detection',
        desc: '🔥 "Root Cause Gap" flags the foundational topic causing trouble downstream. Fixing the root topic unlocks the others.',
      },
    ],
    proTip:
      'Click any node on the graph to slide open its Prerequisite Inspector drawer and explore dependencies!',
  },
  {
    step: 5,
    id: 'knowledge-decay',
    title: 'Decay Tracker & Retention Curves',
    subtitle: 'Track memory fade over time and forecast 30-day retention',
    icon: TrendingDown,
    accentColor: 'from-amber-400 to-rose-500',
    badgeText: 'Step 5: Memory Retention',
    actionTab: 'decay',
    actionLabel: 'Open Decay Tracker',
    summary:
      'CampusInsight AI tracks how many days have elapsed since each topic was practiced, estimating memory fade so you know exactly when to review.',
    keyPoints: [
      {
        title: 'Dynamic Syllabus & Topic Selection',
        desc: 'Select any Unit and Topic to inspect its forgetting curve and memory half-life based on cognitive science.',
      },
      {
        title: '30-Day Memory Projection',
        desc: 'View an intuitive chart showing where your retention stands today and where it will be in 2 to 4 weeks without review.',
      },
      {
        title: 'Interactive Time Gap Simulator',
        desc: 'Slide the time-gap bar to simulate a 21-day learning gap and see how quick review quizzes restore retention to 100%.',
      },
    ],
    proTip:
      'Topics not yet assessed display a clear card with a direct button to take their first diagnostic quiz!',
  },
  {
    step: 6,
    id: 'adaptive-roadmap',
    title: 'Adaptive Roadmap & Action Guidance',
    subtitle: 'Upload syllabus PDFs and follow unit-by-unit action guidance tags',
    icon: Compass,
    accentColor: 'from-purple-500 to-indigo-500',
    badgeText: 'Step 6: Curriculum Roadmap',
    actionTab: 'roadmap',
    actionLabel: 'Open Adaptive Roadmap',
    summary:
      'The Adaptive Roadmap organizes your course into expandable Units. Upload any syllabus PDF or study with our pre-built curricula.',
    keyPoints: [
      {
        title: 'Upload Any Course PDF',
        desc: 'Click "Upload Syllabus PDF" to automatically extract units, topics, and diagnostic questions from your course outline.',
      },
      {
        title: 'Expandable Units & Progress',
        desc: 'Click any Unit banner to expand topics and monitor your overall completion progress bar.',
      },
      {
        title: 'Action Guidance Badges',
        desc: 'REMEDIATE (fix prerequisite first), REVIEW (brush up), PRACTICE (test skills), ADVANCE (unlock next topic), or CHALLENGE (mastery).',
      },
    ],
    proTip:
      'Pay special attention to the orange "REMEDIATE" tag — it indicates a foundational concept must be revisited first!',
  },
  {
    step: 7,
    id: 'quizzes-retake',
    title: 'Quizzes: PDF-Upload-First & Retake Options',
    subtitle: 'Upload syllabus PDF, choose detected topics, and choose Retake vs Another Set',
    icon: Award,
    accentColor: 'from-teal-500 to-emerald-500',
    badgeText: 'Step 7: Diagnostic Testing',
    actionTab: 'quiz',
    actionLabel: 'Go to Quiz Page',
    summary:
      'Upload course PDFs to automatically extract topics, select your focus topic, take diagnostic quizzes, and choose between Retake Quiz and Start Another Set.',
    keyPoints: [
      {
        title: 'PDF-Upload-First & Topic Detection',
        desc: 'Upload your syllabus PDF, select from detected topics or pick from existing concepts, and start targeted testing.',
      },
      {
        title: '[ Retake Quiz ]',
        desc: 'Reloads the exact same questions and options so you can review mistakes, understand explanations, and verify mastery.',
      },
      {
        title: '[ Start Another Set ]',
        desc: 'Fetches completely fresh, non-repeating questions for the SAME topic with tracked history so you never get duplicates.',
      },
    ],
    proTip:
      'If you score below 75%, click "Retake Quiz" first to learn from mistakes, then click "Start Another Set" to test with fresh questions!',
  },
  {
    step: 8,
    id: 'brain-blast',
    title: 'Brain Blast Cognitive Refresher',
    subtitle: '6 quick 1–3 minute mini-games to refresh focus between study blocks',
    icon: Zap,
    accentColor: 'from-violet-500 to-purple-600',
    badgeText: 'Step 8: Mental Recharge',
    actionTab: 'brain-blast',
    actionLabel: 'Play Brain Blast',
    summary:
      'Take quick mental breaks with 6 interactive cognitive mini-games designed to boost working memory, pattern recognition, and focus.',
    keyPoints: [
      {
        title: '6 Cognitive Mini-Games',
        desc: 'Memory Match (pair cards), Quick Pattern (logical sequences), Speed Sort (fast sorting), Odd One Out, Memory Sequence, and Reaction Blast.',
      },
      {
        title: 'High Score & Speed Tracking',
        desc: 'Tracks your high scores, precision accuracy, and speed under your active student persona.',
      },
      {
        title: '1–2 Minute Quick Reset',
        desc: 'Fast, refreshing, and non-academic — perfect for recharging between intense study periods.',
      },
    ],
    proTip:
      'Play a quick round of Speed Sort or Memory Match between difficult study units to keep your mind sharp!',
  },
  {
    step: 9,
    id: 'doubt-ai',
    title: 'DOUBT AI Tutor & Instant Help',
    subtitle: '24/7 personal study partner for explanations, analogies, and questions',
    icon: Bot,
    accentColor: 'from-teal-400 to-emerald-400',
    badgeText: 'Step 9: AI Assistant',
    actionTab: 'faculty',
    actionLabel: 'Open DOUBT AI',
    summary:
      'The floating DOUBT AI assistant in the bottom corner provides instant, friendly explanations and step-by-step guidance whenever you need help.',
    keyPoints: [
      {
        title: 'Always Accessible',
        desc: 'Click the glowing assistant widget in the bottom-right corner from any page to ask questions anytime.',
      },
      {
        title: 'Syllabus-Grounded Answers',
        desc: 'DOUBT understands your active topics and provides tailored explanations suited to your syllabus.',
      },
      {
        title: 'Plain-English Analogies & Code',
        desc: 'Ask for real-world examples, beginner code walkthroughs, or study tips whenever you get stuck.',
      },
    ],
    proTip:
      'Ask DOUBT: "Explain this topic with a simple real-world analogy and 3 key takeaways!"',
  },
];

const GLOSSARY_TERMS = [
  {
    term: 'Student Map',
    simple: 'Individual student academic analytics hub.',
    details:
      'Displays isolated, individual student data including Attendance Trends, Assessment Performance, Internal Performance, Subject-wise Breakdown, and Faculty Intervention status.',
    badge: 'Core Feature',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    term: 'Mastery / Retention (%)',
    simple: 'How well you currently know and remember a topic.',
    details:
      'Starts at 0% when unstudied, increases when you pass quizzes, and gradually declines over days without review based on natural human forgetting curves.',
    badge: 'Core Metric',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    term: '🟢 Strong (≥ 85%)',
    simple: 'Concept is deeply remembered.',
    details:
      'You understand this topic thoroughly and have practiced recently. It serves as a solid foundation for advanced downstream topics.',
    badge: 'Mastered',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    term: '🔵 Stable (70 – 84%)',
    simple: 'Concept is well understood.',
    details:
      'Good retention with minor practice gaps. You are ready to advance to more challenging dependent concepts.',
    badge: 'Good Standing',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
  {
    term: '🟡 Weakening (50 – 69%)',
    simple: 'Memory is starting to fade.',
    details:
      'You understood this in the past, but several days without review have caused memory decay. A quick 3-minute quiz will restore it to 100%.',
    badge: 'Needs Review',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    term: '🔴 At Risk (< 50%)',
    simple: 'Critical knowledge gap.',
    details:
      'Mastery is severely degraded or the topic has never been tested. Advanced concepts that depend on this topic will be blocked or difficult to pass.',
    badge: 'High Priority',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    term: '🔥 Root Cause Gap',
    simple: 'The foundational topic causing you trouble.',
    details:
      'When you struggle with an advanced concept, the root cause is usually an earlier topic that was forgotten. Fixing this first unlocks the rest.',
    badge: 'Bottleneck',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    term: 'Retake Quiz vs. Start Another Set',
    simple: 'Reviewing mistakes vs. testing fresh questions.',
    details:
      'Retake Quiz reloads the exact same quiz questions so you can test your corrections. Start Another Set generates completely new questions for the same topic with zero repeats.',
    badge: 'Quiz Engine',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    term: 'Brain Blast',
    simple: 'Short mental refresher mini-games.',
    details:
      '6 fun cognitive games (1–3 minutes each) designed to stimulate memory, attention, reaction, and logic between heavy study sessions.',
    badge: 'Cognitive Break',
    color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  },
  {
    term: 'DOUBT AI Tutor',
    simple: 'Your 24/7 personal study assistant.',
    details:
      'An intelligent study partner in the bottom-right corner ready to explain concepts, give analogies, and write sample code whenever you feel stuck.',
    badge: 'AI Assistant',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
];

const FAQS = [
  {
    q: 'How does CampusInsight AI differ from traditional learning platforms?',
    a: 'Traditional platforms only log if you completed a lesson in the past. CampusInsight AI tracks individual student academic health, attendance trends, internal performance, and cognitive memory curves to alert you before concepts fade.',
    category: 'General',
  },
  {
    q: 'How do I download the Learning Progress Report PDF?',
    a: 'Navigate to the "Student Map" page and click "Download Learning Progress Report". The system generates an official 10-section verified PDF containing the active student\'s academic overview, attendance trajectory, internal marks, and personalized recommendations.',
    category: 'Reports',
  },
  {
    q: 'What is the difference between "Retake Quiz" and "Start Another Set"?',
    a: '"Retake Quiz" reloads the exact same questions from your quiz so you can review where you went wrong and verify your understanding. "Start Another Set" generates completely fresh questions for the same topic, tracking question history so you never get repeat questions.',
    category: 'Quizzes',
  },
  {
    q: 'How do the 5 built-in student profiles work?',
    a: 'CampusInsight AI includes 5 built-in student records (Deepika, Kavya, Santhosh, Karthik, and Mukesh). Use the student switcher in the top navigation to view each student\'s distinct attendance, assessment scores, and subject breakdown.',
    category: 'General',
  },
  {
    q: 'What are the 6 Brain Blast mini-games for?',
    a: 'They provide short 1- to 3-minute mental breaks between study blocks. They are not academic tests; instead, they activate working memory, pattern detection, classification speed, and reaction time to keep your mind energized.',
    category: 'Brain Blast',
  },
  {
    q: 'How do I upload my own course syllabus?',
    a: 'Navigate to "Adaptive Roadmap" in the top menu and click "Upload Syllabus PDF". Select any standard course outline or syllabus under 10MB. The system automatically reads the text, creates Units, Topics, and diagnostic quiz questions.',
    category: 'Roadmap',
  },
  {
    q: 'What do the graph colors (Green, Blue, Amber, Red) mean?',
    a: 'Green means Strong (≥85% retention, deeply remembered). Blue means Stable (70–84%, solid foundation). Amber means Weakening (50–69%, memory is fading, review recommended). Red means At Risk (<50%, critical gap that blocks future topics).',
    category: 'Graph',
  },
  {
    q: 'Can I reset my progress or delete my student data?',
    a: 'Yes! Open the user profile or click "Sign In / Register", switch to the "Data Rights" tab, and click "Reset My Progress & Purge Attempts". This immediately clears your quiz history and resets scores in compliance with student privacy standards.',
    category: 'Privacy',
  },
];

export default function HelpSupportPage({ onNavigateToTab, onStartQuiz, onOpenAuth }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('guide'); // 'guide', 'glossary', 'faq', 'actions'
  const [searchQuery, setSearchQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Quick Help Ticket / Question simulator
  const [ticketQuestion, setTicketQuestion] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  const activeStep = GUIDE_STEPS[currentStepIndex];
  const StepIcon = activeStep.icon;

  const handleNext = () => {
    if (currentStepIndex < GUIDE_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleActionClick = (tabId) => {
    if (onNavigateToTab) {
      onNavigateToTab(tabId);
    }
  };

  // Filtered steps and FAQs based on search
  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return GUIDE_STEPS;
    const q = searchQuery.toLowerCase();
    return GUIDE_STEPS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.keyPoints.some((kp) => kp.title.toLowerCase().includes(q) || kp.desc.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((f) => {
      const matchesCat = faqCategory === 'All' || f.category === faqCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, faqCategory]);

  const handleSendTicket = (e) => {
    e.preventDefault();
    if (!ticketQuestion.trim()) return;
    setTicketSent(true);
    setTimeout(() => {
      setTicketQuestion('');
      setTicketSent(false);
    }, 4000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-slate-900/50 p-6 sm:p-7 rounded-3xl border border-slate-800/80 backdrop-blur-md">
        <div className="max-w-xl space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-teal-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Help &amp; Student Support Desk
            </h1>
          </div>
          <p className="text-sm text-slate-300 font-medium">
            Everything you need to know about using CampusInsight AI to track academic progress and master learning concepts.
          </p>
          <p className="text-xs text-slate-500">
            Clear walkthroughs, simple explanations of colors and scores, and direct shortcuts to every feature.
          </p>
        </div>

        {/* Quick Search Input */}
        <div className="w-full md:w-72 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, colors, quiz..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 font-mono"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Main Category Navigation Tabs ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'guide', label: '🧭 Step-by-Step Tour', badge: '10 Steps' },
            { id: 'glossary', label: '📖 Simple Glossary', badge: 'Plain English' },
            { id: 'faq', label: '❓ Common Questions', badge: `${FAQS.length} FAQs` },
            { id: 'actions', label: '🚀 Feature Shortcuts', badge: 'Quick Jump' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  activeTab === tab.id
                    ? 'bg-slate-950/20 text-slate-900'
                    : 'bg-slate-950 text-slate-500'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => handleActionClick('faculty')}
          className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Back to Student Map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: STEP-BY-STEP GUIDED TOUR                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          {/* Progress & Quick Step Bar */}
          <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>
                Learning Workflow: <b>Step {currentStepIndex + 1} of {GUIDE_STEPS.length}</b>
              </span>
              <span className="text-teal-400 font-bold">
                {Math.round(((currentStepIndex + 1) / GUIDE_STEPS.length) * 100)}% Complete
              </span>
            </div>

            {/* Visual Progress Line */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${((currentStepIndex + 1) / GUIDE_STEPS.length) * 100}%` }}
              />
            </div>

            {/* Quick Step Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 scrollbar-none">
              {GUIDE_STEPS.map((s, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isPast = idx < currentStepIndex;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                        : isPast
                        ? 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                        isCurrent
                          ? 'bg-teal-400 text-slate-950'
                          : isPast
                          ? 'bg-slate-800 text-teal-400'
                          : 'bg-slate-900 text-slate-600'
                      }`}
                    >
                      {isPast ? '✓' : s.step}
                    </span>
                    <span>{s.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Step Showcase Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${activeStep.accentColor} p-0.5 shadow-lg shrink-0`}
                >
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <StepIcon className="w-7 h-7 text-slate-100" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                      STEP {activeStep.step} OF {GUIDE_STEPS.length}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {activeStep.badgeText}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                    {activeStep.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{activeStep.subtitle}</p>
                </div>
              </div>

              {/* Direct Jump CTA */}
              <button
                onClick={() => handleActionClick(activeStep.actionTab)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
              >
                <span>{activeStep.actionLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plain English Summary */}
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              {activeStep.summary}
            </p>

            {/* Key Walkthrough Points */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                What to do &amp; What you will see:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeStep.keyPoints.map((pt, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/70 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <h4 className="font-bold text-xs text-slate-100">{pt.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{pt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip Callout */}
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-start gap-3 text-xs text-teal-200">
              <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-teal-300">Study Tip: </strong>
                <span>{activeStep.proTip}</span>
              </div>
            </div>

            {/* Bottom Step Navigation Bar */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>

              <button
                onClick={() => setCurrentStepIndex(0)}
                className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors hidden sm:block cursor-pointer"
              >
                Restart Tour
              </button>

              {currentStepIndex < GUIDE_STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span>Next: {GUIDE_STEPS[currentStepIndex + 1].title.split(' ')[0]}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleActionClick('faculty')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span>Complete Tour &amp; Open Student Map</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: PLAIN-ENGLISH FEATURE GLOSSARY                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'glossary' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Plain-English explanations of all terms, badges, and colors used across CampusInsight AI.
            </span>
            <span className="font-mono text-teal-400 font-bold">{GLOSSARY_TERMS.length} Terms</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GLOSSARY_TERMS.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-100">{item.term}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${item.color}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-teal-300/90 leading-snug">
                    {item.simple}
                  </p>

                  <p className="text-xs text-slate-400 leading-relaxed">{item.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: INTERACTIVE FAQ                                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'faq' && (
        <div className="space-y-5">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'General', 'Quizzes', 'Reports', 'Brain Blast', 'Roadmap', 'Graph', 'Privacy'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setFaqCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    faqCategory === cat
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-200 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-[10px] font-mono text-teal-400 border border-slate-800">
                        {faq.category}
                      </span>
                      <span>{faq.q}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 bg-slate-950/40 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: QUICK ACTION SHORTCUTS                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Click any feature card to jump directly to that page in CampusInsight AI:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              {
                id: 'faculty',
                title: 'Student Map',
                desc: 'View individual student academic analytics, attendance trends, internal performance, and download verified Learning Progress Reports.',
                icon: LayoutDashboard,
                color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
              },
              {
                id: 'graph',
                title: 'Knowledge Graph',
                desc: 'Inspect prerequisite arrows, concept masteries, and root cause gaps in real-time.',
                icon: GitBranch,
                color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
              },
              {
                id: 'decay',
                title: 'Decay Tracker',
                desc: 'View memory retention curves over time and see projected 30-day forgetting patterns.',
                icon: TrendingDown,
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
              },
              {
                id: 'roadmap',
                title: 'Adaptive Roadmap',
                desc: 'Upload course syllabus PDFs and track progress across unit-by-unit action guidance tags.',
                icon: Compass,
                color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
              },
              {
                id: 'quiz',
                title: 'Quiz & Diagnostics',
                desc: 'Upload syllabus or pick topics for diagnostic testing, Retake Quiz, or Start Another Set.',
                icon: BookOpen,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
              },
              {
                id: 'brain-blast',
                title: 'Brain Blast',
                desc: 'Play 6 quick cognitive mini-games to refresh your memory, pattern logic, and focus.',
                icon: Zap,
                color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
              },
            ].map((act) => {
              const ActIcon = act.icon;
              return (
                <div
                  key={act.id}
                  onClick={() => handleActionClick(act.id)}
                  className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${act.color} group-hover:scale-110 transition-transform`}
                    >
                      <ActIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-teal-300 transition-colors">
                      {act.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{act.desc}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 group-hover:text-teal-300">
                    <span>Open Feature</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Question / DOUBT AI Assistance Bar ────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-teal-950/25 to-slate-900/90 border border-teal-500/30 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-400" />
            <h3 className="font-extrabold text-slate-100 text-sm sm:text-base">
              Need help right away? Ask DOUBT AI Tutor!
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-lg">
            DOUBT AI is available 24/7 in the bottom-right corner of your screen. Ask any academic or
            platform question in plain English.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => handleActionClick('faculty')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Open Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );
}
