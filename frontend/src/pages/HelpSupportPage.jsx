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
  Mic,
  Volume2,
  Users,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';

const GUIDE_STEPS = [
  {
    step: 1,
    id: 'dashboard-overview',
    title: 'Student Dashboard & 5 Demo Profiles',
    subtitle: 'Unified academic KPIs, risk indicators, and instant profile switching',
    icon: LayoutDashboard,
    accentColor: 'from-blue-500 to-cyan-500',
    badgeText: 'Step 1: Get Started',
    actionTab: 'dashboard',
    actionLabel: 'Open Dashboard',
    summary:
      'The Dashboard is your academic home base. It displays live KPIs for Attendance, Assessment Score, Internal Marks, and CGPA, alongside an Academic Risk Level badge. Switch effortlessly between 5 pre-built student personas or sign in with your own account.',
    keyPoints: [
      {
        title: '5 Built-in Demo Students',
        desc: 'Switch between Deepika, Kavya, Santhosh, Karthik, and Mukesh in the top switcher to test high-achieving, moderate, and critical-risk scenarios.',
      },
      {
        title: 'Academic Health Indicators',
        desc: 'Review real-time attendance trends, internal exam summaries, and early warning flags for attendance below the 75% regulatory cutoff.',
      },
      {
        title: 'Dark & Light Mode',
        desc: 'Toggle the Sun/Moon icon in the top-right navbar anytime for comfortable reading in bright or dim environments.',
      },
    ],
    proTip:
      'Santhosh and Mukesh demonstrate how low attendance (<75%) and lagging internal scores trigger automatic faculty intervention alerts!',
  },
  {
    step: 2,
    id: 'jarvis-voice',
    title: 'Jarvis AI Voice Assistant & Robot Avatar',
    subtitle: 'Cinematic, hands-free voice navigation and real-time student analytics answers',
    icon: Mic,
    accentColor: 'from-cyan-400 to-blue-600',
    badgeText: 'Step 2: Voice AI',
    actionTab: 'dashboard',
    actionLabel: 'Try Hey Jarvis',
    summary:
      'CampusInsight AI features a futuristic, hands-free Jarvis assistant with an animated technical robot avatar and glowing audio equalizer orb. Say "Hey Jarvis" or "Hey Chat" anywhere on the site for instant sub-200ms activation.',
    keyPoints: [
      {
        title: 'Instant Voice Activation',
        desc: 'Say "Hey Jarvis" or "Hey Chat" to immediately open the full-screen voice modal. The robot avatar greets you by name and listens for your command.',
      },
      {
        title: 'Hands-Free Site Navigation',
        desc: 'Speak commands like "Open Roadmap", "Open Quiz", "Open Knowledge Graph", "Open Decay Tracker", or "Open Faculty Dashboard" for instant redirection.',
      },
      {
        title: 'Student Data Query Answering',
        desc: 'Ask real questions: "What is my attendance percentage?", "Which subject am I weak in?", "What is my CGPA?", or "Give me study recommendations".',
      },
    ],
    proTip:
      'When the assistant is closed, intelligent session gating silently ignores ambient background conversations, so friends talking in the room won\'t interrupt you!',
  },
  {
    step: 3,
    id: 'quiz-syllabus-upload',
    title: 'Quiz & Syllabus PDF Ingestion',
    subtitle: 'Single entry point for course PDFs, diagnostic testing, and topic sync',
    icon: BookOpen,
    accentColor: 'from-emerald-500 to-teal-500',
    badgeText: 'Step 3: Core Input',
    actionTab: 'quiz',
    actionLabel: 'Go to Quiz Page',
    summary:
      'The Quiz section is the sole entry point for course materials. Upload any syllabus or lecture PDF here to automatically extract topics, generate diagnostic questions, and synchronize the entire platform.',
    keyPoints: [
      {
        title: 'Single Syllabus Entry Point',
        desc: 'Upload course PDFs only here in Quiz. Extracted topics automatically populate the Knowledge Graph, Decay Tracker, and Adaptive Roadmap.',
      },
      {
        title: '[ Retake Quiz ]',
        desc: 'Reloads the exact same questions and options so you can review mistakes, understand step-by-step explanations, and verify mastery.',
      },
      {
        title: '[ Start Another Set ]',
        desc: 'Generates completely fresh, non-repeating questions for the same topic with history tracking to guarantee no duplicate questions.',
      },
    ],
    proTip:
      'After completing a quiz, your updated score immediately calibrates retention in the Decay Tracker and unlocks steps in the Roadmap!',
  },
  {
    step: 4,
    id: 'knowledge-graph',
    title: 'Living Knowledge Graph & Color Health Bands',
    subtitle: 'Inspect prerequisite dependencies, concept mastery, and root cause gaps',
    icon: GitBranch,
    accentColor: 'from-teal-400 to-cyan-500',
    badgeText: 'Step 4: Dependency Graph',
    actionTab: 'graph',
    actionLabel: 'View Knowledge Graph',
    summary:
      'An interactive visual graph showing how academic concepts connect. Directed arrows point from foundational prerequisites to advanced topics, with node borders reflecting real-time memory strength.',
    keyPoints: [
      {
        title: '4 Color Health Bands',
        desc: '🟢 Strong (≥85%): solid memory. 🔵 Stable (70-84%): well understood. 🟡 Weakening (50-69%): review recommended. 🔴 At Risk (<50%): critical gap.',
      },
      {
        title: 'Prerequisite Arrows (→)',
        desc: 'Arrows highlight sequence dependencies (e.g. Arrays → Linked Lists → Trees). You must master foundational topics to comprehend advanced ones.',
      },
      {
        title: '🔥 Root Cause Gap Analyzer',
        desc: 'When an advanced topic is failing, the system traces backward along the dependency chain to pinpoint the forgotten prerequisite causing the bottleneck.',
      },
    ],
    proTip:
      'Click any node on the graph to slide open the Prerequisite Inspector drawer with direct access to take targeted quizzes!',
  },
  {
    step: 5,
    id: 'decay-tracker',
    title: 'Decay Tracker & Ebbinghaus Forgetting Curves',
    subtitle: 'Track memory half-life, 30-day retention forecast, and simulate time gaps',
    icon: TrendingDown,
    accentColor: 'from-amber-400 to-rose-500',
    badgeText: 'Step 5: Memory Retention',
    actionTab: 'decay',
    actionLabel: 'Open Decay Tracker',
    summary:
      'Built upon the Ebbinghaus Forgetting Curve model, the Decay Tracker (DK Analyzer) monitors how many days have elapsed since each topic was practiced, estimating retention decay before exam time.',
    keyPoints: [
      {
        title: 'Syllabus-Synced Topics',
        desc: 'Uses the exact topics extracted from your Quiz syllabus upload. No mismatched or foreign topics are displayed.',
      },
      {
        title: '30-Day Memory Projection',
        desc: 'Visualizes where your memory stands today and simulates its projected drop over the next 2 to 4 weeks without review.',
      },
      {
        title: 'Time Gap Simulator',
        desc: 'Slide the time-gap bar to simulate a 21-day study pause, observing how a single quick review restores retention back to 100%.',
      },
    ],
    proTip:
      'Topics decaying below 65% trigger priority revision alerts in your recommended study actions!',
  },
  {
    step: 6,
    id: 'adaptive-roadmap',
    title: 'Adaptive Roadmap & Unit Guidance Tags',
    subtitle: 'Dynamic syllabus learning progression with prerequisite unlocking',
    icon: Compass,
    accentColor: 'from-purple-500 to-indigo-500',
    badgeText: 'Step 6: Learning Path',
    actionTab: 'roadmap',
    actionLabel: 'Open Adaptive Roadmap',
    summary:
      'The Adaptive Roadmap organizes your course into unit-by-unit milestones derived directly from your Quiz syllabus data. Milestones reflect your live quiz mastery and decay status without needing separate uploads.',
    keyPoints: [
      {
        title: 'Shared Syllabus Dataset',
        desc: 'Uses the exact syllabus hierarchy uploaded via Quiz. Eliminates redundant PDF uploads in the Roadmap section.',
      },
      {
        title: 'Action Guidance Badges',
        desc: 'REMEDIATE (fix prerequisite first), REVIEW (brush up decaying topic), PRACTICE (test knowledge), or ADVANCE (unlock next module).',
      },
      {
        title: 'Prerequisite Progression',
        desc: 'Advanced modules unlock progressively as earlier concepts reach verified mastery.',
      },
    ],
    proTip:
      'Pay special attention to orange "REMEDIATE" badges — they indicate an earlier foundational concept must be revisited before moving forward!',
  },
  {
    step: 7,
    id: 'student-profile-reports',
    title: 'Student Profile & Verified PDF Reports',
    subtitle: 'Semester trends, subject breakdowns, and 10-section official PDF reports',
    icon: User,
    accentColor: 'from-emerald-400 to-teal-500',
    badgeText: 'Step 7: Profile & Reports',
    actionTab: 'profile',
    actionLabel: 'Open Student Profile',
    summary:
      'The Student Profile provides a comprehensive record of your academic health. View 6-month attendance trajectories, internal marks, subject scores, and download an official multi-page verified PDF progress report.',
    keyPoints: [
      {
        title: 'Comprehensive Subject Breakdown',
        desc: 'Inspect internal exam marks, attendance rates, and assignment scores across DSA, OS, DBMS, Networks, and Mathematics.',
      },
      {
        title: 'Download Progress Report (PDF)',
        desc: 'Click "Download Learning Progress Report" to generate an official 10-section PDF report with security verification stamps.',
      },
      {
        title: 'Faculty Advisor Insights',
        desc: 'Read personalized qualitative insights and targeted improvement recommendations tailored to your performance.',
      },
    ],
    proTip:
      'Download your PDF report before faculty reviews or mentor counseling check-ins for a complete academic snapshot!',
  },
  {
    step: 8,
    id: 'faculty-dashboard',
    title: 'Faculty & Mentor Early-Warning Dashboard',
    subtitle: 'Cohort monitoring, attendance cutoff alerts, and automated interventions',
    icon: Users,
    accentColor: 'from-indigo-500 to-purple-600',
    badgeText: 'Step 8: Faculty Hub',
    actionTab: 'faculty',
    actionLabel: 'Open Faculty Dashboard',
    summary:
      'Designed for mentors and professors, the Faculty Dashboard monitors entire student cohorts, flags students facing attendance shortages (<75%) or failing internal marks, and generates recommended interventions.',
    keyPoints: [
      {
        title: '4-Tier Academic Risk Matrix',
        desc: 'Categorizes students into Low, Moderate, High, and Critical risk based on attendance adherence, internal scores, and decay.',
      },
      {
        title: 'Attendance Shortage Alerts',
        desc: 'Instantly identifies students dipping below the 75% cutoff threshold before university semester detention deadlines.',
      },
      {
        title: 'Actionable Interventions',
        desc: 'Recommends tailored intervention protocols: remedial assignments, peer tutoring, faculty counseling, or parent conferences.',
      },
    ],
    proTip:
      'Faculty can filter cohorts by risk level or search by roll number (CSBS001–CSBS005) for immediate student lookup!',
  },
  {
    step: 9,
    id: 'brain-blast',
    title: 'Brain Blast Cognitive Mini-Games',
    subtitle: '6 rapid 1–3 minute exercises to recharge working memory and concentration',
    icon: Zap,
    accentColor: 'from-violet-500 to-purple-600',
    badgeText: 'Step 9: Mental Recharge',
    actionTab: 'brain-blast',
    actionLabel: 'Play Brain Blast',
    summary:
      'Take productive mental breaks between difficult study units with 6 cognitive exercises designed to stimulate working memory, logic patterns, and reaction speed.',
    keyPoints: [
      {
        title: '6 Cognitive Mini-Games',
        desc: 'Memory Match (flip card pairs), Quick Pattern (logical sequences), Speed Sort (fast sorting), Odd One Out, Memory Sequence, and Reaction Blast.',
      },
      {
        title: 'Accuracy & Speed Tracking',
        desc: 'Tracks high scores, precision percentage, and reaction speeds under your active student persona.',
      },
      {
        title: '1–2 Minute Quick Reset',
        desc: 'Lightweight and non-academic — ideal for resetting focus between intense study blocks.',
      },
    ],
    proTip:
      'Ask Jarvis voice: "Open Brain Blast" anytime for an instant mental break!',
  },
  {
    step: 10,
    id: 'doubt-ai',
    title: 'DOUBT AI Chatbot Tutor',
    subtitle: '24/7 Gemini-powered contextual study partner for explanations and hints',
    icon: Bot,
    accentColor: 'from-teal-400 to-emerald-400',
    badgeText: 'Step 10: AI Assistant',
    actionTab: 'dashboard',
    actionLabel: 'Try DOUBT AI',
    summary:
      'The floating DOUBT AI assistant in the bottom-right corner provides instant explanations, real-world analogies, step-by-step guidance, and code walkthroughs whenever you need help.',
    keyPoints: [
      {
        title: 'Always Available',
        desc: 'Click the glowing assistant widget in the bottom-right corner from any page to ask questions anytime.',
      },
      {
        title: 'Syllabus-Aware Tutoring',
        desc: 'DOUBT understands your active topics, quiz mistakes, and decay areas, delivering targeted explanations.',
      },
      {
        title: 'Plain-English Analogies',
        desc: 'Ask for simplified analogies, code breakdowns, or revision summaries whenever you encounter a roadblock.',
      },
    ],
    proTip:
      'Ask DOUBT: "Explain this concept with a simple real-world analogy and 3 key takeaways!"',
  },
];

const GLOSSARY_TERMS = [
  {
    term: 'Jarvis Voice Assistant',
    simple: 'Cinematic, hands-free voice AI with animated robot avatar.',
    details:
      'Responds instantly to "Hey Jarvis" or "Hey Chat". Navigates pages, answers student attendance/grade questions, and explains weak subjects using live profile data.',
    badge: 'Voice AI',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
  {
    term: 'Single-Source Syllabus Sync',
    simple: 'One PDF upload in Quiz powers all modules.',
    details:
      'Uploading a syllabus PDF in the Quiz section extracts topics once and synchronizes them across the Knowledge Graph, Decay Tracker, and Adaptive Roadmap with identical topic IDs.',
    badge: 'Architecture',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    term: 'Ebbinghaus Forgetting Curve',
    simple: 'Mathematical model of human memory decay over time.',
    details:
      'Calculates retention decay based on elapsed days since last practice: Retention(t) = max(floor, initial_score × e^(-t / stability)).',
    badge: 'Decay Engine',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    term: '🟢 Strong (≥ 85%)',
    simple: 'Concept is deeply retained in memory.',
    details:
      'Thoroughly mastered and practiced recently. Functions as a stable prerequisite for advanced downstream concepts.',
    badge: 'Mastered',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    term: '🔵 Stable (70 – 84%)',
    simple: 'Concept is well understood.',
    details:
      'Good retention with mild practice gaps. Ready to progress to challenging dependent topics.',
    badge: 'Good Standing',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
  {
    term: '🟡 Weakening (50 – 69%)',
    simple: 'Memory has started to fade.',
    details:
      'Understood previously, but several days without review have caused memory decay. A brief 3-minute quiz restores retention to 100%.',
    badge: 'Needs Review',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    term: '🔴 At Risk (< 50%)',
    simple: 'Critical conceptual knowledge gap.',
    details:
      'Retention is severely degraded or the topic has never been tested. Blocks advancement into dependent topics.',
    badge: 'High Priority',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    term: '🔥 Root Cause Gap',
    simple: 'Foundational topic causing downstream failure.',
    details:
      'When an advanced concept fails, the system traces backward along prerequisite dependencies to identify the forgotten foundational concept causing the issue.',
    badge: 'Bottleneck',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    term: 'Retake Quiz vs. Start Another Set',
    simple: 'Reviewing mistakes vs. testing fresh questions.',
    details:
      'Retake Quiz reloads the exact same questions to test corrections. Start Another Set fetches completely fresh, non-repeating questions for the same topic.',
    badge: 'Quiz Engine',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    term: 'Faculty Early Warning Risk Tiers',
    simple: 'Cohort classification for timely intervention.',
    details:
      'Categorizes students into Low, Moderate, High, and Critical risk tiers based on attendance adherence (<75% cutoff), internal test averages, and knowledge decay.',
    badge: 'Faculty Analytics',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    term: 'Action Guidance Badges',
    simple: 'Adaptive Roadmap unit status tags.',
    details:
      'REMEDIATE (fix prerequisite first), REVIEW (brush up decaying topic), PRACTICE (test skills), ADVANCE (unlock next topic), or CHALLENGE (mastery).',
    badge: 'Roadmap',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
  {
    term: 'Brain Blast',
    simple: 'Short 1–3 minute cognitive refresher games.',
    details:
      '6 mini-games (Memory Match, Quick Pattern, Speed Sort, Odd One Out, Memory Sequence, Reaction Blast) to stimulate working memory and alertness.',
    badge: 'Cognitive Break',
    color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  },
];

const FAQS = [
  {
    q: 'How do I activate the Jarvis AI Voice Assistant?',
    a: 'Simply say "Hey Jarvis" or "Hey Chat" from any page on the website. The animated robot avatar and full-screen voice overlay will open in under 200ms. You can also click the floating robot avatar icon in the bottom-left corner.',
    category: 'Jarvis Voice',
  },
  {
    q: 'What voice commands can I speak to Jarvis?',
    a: 'You can navigate anywhere ("Open Roadmap", "Open Quiz", "Open Knowledge Graph", "Open Decay Tracker", "Open Faculty", "Open Brain Blast") or ask about your performance ("What is my attendance percentage?", "What is my assessment score?", "Which subject am I weak in?", "What is my CGPA?", "Give me recommendations").',
    category: 'Jarvis Voice',
  },
  {
    q: 'Will Jarvis accidentally interrupt when I speak with friends in the room?',
    a: 'No! When the assistant is closed, intelligent session gating silently ignores ambient conversations and friends talking. It only activates when it hears the specific wake phrase ("Hey Jarvis" or "Hey Chat").',
    category: 'Jarvis Voice',
  },
  {
    q: 'Where do I upload my course syllabus PDF?',
    a: 'The Quiz section is the sole entry point for uploading syllabus materials. Click "Upload Material" in the Quiz page. The system automatically extracts topics and synchronizes them across the Knowledge Graph, Decay Tracker, and Adaptive Roadmap with identical topic IDs.',
    category: 'Quiz & Syllabus',
  },
  {
    q: 'Why does the Roadmap no longer ask for a separate PDF upload?',
    a: 'We unified the syllabus pipeline: the Adaptive Roadmap automatically inherits the topics, hierarchy, and mastery data extracted from the Quiz upload. This eliminates duplicate uploads and prevents mismatched topic lists.',
    category: 'Roadmap',
  },
  {
    q: 'What is the difference between "Retake Quiz" and "Start Another Set"?',
    a: '"Retake Quiz" reloads the exact same questions from your attempt so you can review your mistakes and understand explanations. "Start Another Set" generates completely fresh, non-repeating questions for the same topic while tracking question history.',
    category: 'Quiz & Syllabus',
  },
  {
    q: 'How does the Decay Tracker (DK Analyzer) calculate retention?',
    a: 'It uses the Ebbinghaus Forgetting Curve formula to model retention decay based on elapsed days since your last quiz practice. Topics are categorized into Strong (≥85%), Stable (70–84%), Weakening (50–69%), and At Risk (<50%).',
    category: 'Decay Tracker',
  },
  {
    q: 'What do the Knowledge Graph colors (Green, Blue, Amber, Red) mean?',
    a: 'Green means Strong (≥85% retention, deeply remembered). Blue means Stable (70–84%, well understood). Amber means Weakening (50–69%, memory fading, review recommended). Red means At Risk (<50%, critical gap blocking dependent concepts).',
    category: 'Graph',
  },
  {
    q: 'How do faculty and mentors identify at-risk students?',
    a: 'The Faculty Dashboard displays cohort analytics categorized into Low, Moderate, High, and Critical risk tiers. Students with attendance below the 75% cutoff or declining internal scores are highlighted with targeted intervention recommendations.',
    category: 'Faculty & Reports',
  },
  {
    q: 'How do I download the Learning Progress Report PDF?',
    a: 'Navigate to the "Student Profile" page and click "Download Learning Progress Report". The system generates an official 10-section verified PDF containing attendance trajectories, internal exam breakdowns, and personalized AI recommendations.',
    category: 'Faculty & Reports',
  },
  {
    q: 'How do the 5 built-in student profiles work?',
    a: 'CampusInsight AI includes 5 pre-configured student records: Deepika (High achiever), Kavya (Moderate), Santhosh (High risk / low attendance), Karthik (Consistent), and Mukesh (Critical risk). Use the top switcher to inspect each record.',
    category: 'General',
  },
  {
    q: 'What are the 6 Brain Blast cognitive mini-games for?',
    a: 'They provide 1- to 3-minute mental resets between intense study units. Games like Memory Match, Quick Pattern, Speed Sort, Odd One Out, Memory Sequence, and Reaction Blast stimulate working memory and alertness without academic stress.',
    category: 'Brain Blast',
  },
  {
    q: 'Can I reset my student data or clear my history?',
    a: 'Yes! Open the user profile or click "Sign In / Register", switch to the "Data Rights" tab, and click "Reset My Progress & Purge Attempts". This immediately clears quiz histories and resets scores in compliance with student privacy standards.',
    category: 'Privacy',
  },
];

export default function HelpSupportPage({ onNavigateToTab, onStartQuiz, onOpenAuth }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('guide'); // 'guide', 'glossary', 'faq', 'actions'
  const [searchQuery, setSearchQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState(null);

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
            Complete guide to CampusInsight AI: Jarvis Voice Assistant, Quiz &amp; Syllabus Sync, Knowledge Decay, and Early-Warning Analytics.
          </p>
          <p className="text-xs text-slate-500">
            Interactive walkthroughs, plain-English definitions of metrics &amp; colors, and one-click shortcuts to every feature.
          </p>
        </div>

        {/* Quick Search Input */}
        <div className="w-full md:w-72 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voice, quiz, decay, roadmap..."
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
            { id: 'guide', label: '🧭 Step-by-Step Tour', badge: `${GUIDE_STEPS.length} Steps` },
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
          onClick={() => handleActionClick('dashboard')}
          className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Back to Dashboard</span>
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
                Workflow Guide: <b>Step {currentStepIndex + 1} of {GUIDE_STEPS.length}</b>
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
                <strong className="font-bold text-teal-300">Pro Tip: </strong>
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
                  onClick={() => handleActionClick('dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span>Complete Tour &amp; Open Dashboard</span>
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
              Plain-English explanations of metrics, colors, voice controls, and algorithms in CampusInsight AI.
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
            {[
              'All',
              'Jarvis Voice',
              'Quiz & Syllabus',
              'Decay Tracker',
              'Roadmap',
              'Graph',
              'Faculty & Reports',
              'Brain Blast',
              'General',
              'Privacy',
            ].map((cat) => (
              <button
                key={cat}
                onClick={() => setFaqCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  faqCategory === cat
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
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
                id: 'dashboard',
                title: 'Student Dashboard',
                desc: 'View personal academic KPIs, attendance trajectories, and risk level status.',
                icon: LayoutDashboard,
                color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
              },
              {
                id: 'quiz',
                title: 'Quiz & Syllabus Upload',
                desc: 'Upload syllabus PDFs, take diagnostic quizzes, Retake Quiz, or Start Another Set.',
                icon: BookOpen,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
              },
              {
                id: 'graph',
                title: 'Knowledge Graph',
                desc: 'Explore prerequisite dependencies, memory strength, and root cause gap bottlenecks.',
                icon: GitBranch,
                color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
              },
              {
                id: 'decay',
                title: 'Decay Tracker (DK Analyzer)',
                desc: 'Track Ebbinghaus retention curves, forecast 30-day forgetting, and test time gaps.',
                icon: TrendingDown,
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
              },
              {
                id: 'roadmap',
                title: 'Adaptive Roadmap',
                desc: 'Follow unit-by-unit action guidance tags synced from your Quiz syllabus topics.',
                icon: Compass,
                color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
              },
              {
                id: 'profile',
                title: 'Student Profile & Reports',
                desc: 'Inspect subject breakdowns and download official 10-section PDF progress reports.',
                icon: User,
                color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
              },
              {
                id: 'faculty',
                title: 'Faculty Dashboard',
                desc: 'Monitor cohort performance, early warning risk tiers, and attendance shortages (<75%).',
                icon: Users,
                color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
              },
              {
                id: 'brain-blast',
                title: 'Brain Blast Cognitive Suite',
                desc: 'Play 6 cognitive mini-games to sharpen focus, memory sequence, and speed.',
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

      {/* ── Quick Question / Assistant Guidance Bar ─────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-teal-950/25 to-slate-900/90 border border-teal-500/30 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-teal-400" />
            <h3 className="font-extrabold text-slate-100 text-sm sm:text-base">
              Try Hands-Free Voice Assistance with Jarvis!
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-lg">
            Say <strong>"Hey Jarvis"</strong> or <strong>"Hey Chat"</strong> anytime to open the animated robot assistant. Or chat 24/7 with the <strong>DOUBT AI</strong> tutor in the bottom-right corner.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => handleActionClick('dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
