import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
// DemoController (Judges Storyboard) removed — not shown on CampusInsight AI dashboard
import NodeDetailDrawer from './components/NodeDetailDrawer';
import AuthModal from './components/AuthModal';
import FacultyDashboardPage from './pages/FacultyDashboardPage';
import DashboardPage from './pages/DashboardPage';
import RoadmapPage from './pages/RoadmapPage';
import GraphPage from './pages/GraphPage';
import DecayPage from './pages/DecayPage';
import QuizPage from './pages/QuizPage';
import BrainBlastPage from './pages/BrainBlastPage';
import HelpSupportPage from './pages/HelpSupportPage';
import MentorDashboardPage from './pages/MentorDashboardPage';
import StudentProfilePage from './pages/StudentProfilePage';
import DoubtChatbot from './components/DoubtChatbot';
import { JarvisAssistant } from './components/jarvis';
import GoogleAuthCallback from './components/GoogleAuthCallback';
import { api } from './services/api';
import { MENTOR_PROFILE, STUDENT_PROFILES } from './data/studentProfiles';
import { getDkTopics, onDkTopicsChange, getActiveMaterial } from './data/dkTopicsStore';

// Detect if the current URL is the Google OAuth callback route
const IS_GOOGLE_CALLBACK = window.location.pathname === '/auth/google/callback';


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeStudentId, setActiveStudentId] = useState(
    () => localStorage.getItem('learnGraph_student_id') || 'student-demo-1'
  );
  const [currentStudent, setCurrentStudent] = useState(null);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('learnGraph_display_name') || null
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState('stage_3_failed_trees');
  const [selectedConceptForQuiz, setSelectedConceptForQuiz] = useState('');
  const [selectedConceptNameForQuiz, setSelectedConceptNameForQuiz] = useState('');
  const [inspectedConcept, setInspectedConcept] = useState(null);

  // Profile mode: 'student' | 'mentor'
  const [activeMode, setActiveMode] = useState(
    () => localStorage.getItem('learnGraph_mode') || 'student'
  );

  const handleModeSwitch = (mode) => {
    setActiveMode(mode);
    localStorage.setItem('learnGraph_mode', mode);
    // Reset to default tab when switching mode
    if (mode === 'student') setActiveTab('dashboard');
  };

  // Light / Dark Theme State (Default: Dark Mode)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Core Data States
  const [masteryOverview, setMasteryOverview] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [decayData, setDecayData] = useState(null);
  const [recommendationsData, setRecommendationsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth session on startup
  useEffect(() => {
    const checkAuth = async () => {
      // Check if URL has token from OAuth redirect
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        localStorage.setItem('learnGraph_token', urlToken);
        const urlStudentId = urlParams.get('student_id');
        const urlName = urlParams.get('name');
        if (urlStudentId) localStorage.setItem('learnGraph_student_id', urlStudentId);
        if (urlName) localStorage.setItem('learnGraph_display_name', urlName);
        window.history.replaceState({}, '', window.location.pathname);
      }

      const token = localStorage.getItem('learnGraph_token');
      if (token) {
        try {
          const student = await api.getMe();
          if (student && student.id) {
            setCurrentStudent(student);
            setActiveStudentId(student.id);
            // Keep localStorage fresh with server values
            const name = student.nickname || student.name;
            localStorage.setItem('learnGraph_student_id', student.id);
            localStorage.setItem('learnGraph_display_name', name);
            setDisplayName(name);
          }
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          api.logout();
          setDisplayName(null);
        }
      }
    };
    checkAuth();
  }, []);

  // Synchronize student data from REST APIs
  const fetchStudentData = useCallback(async (studentId = activeStudentId) => {
    try {
      setError(null);
      const [mRes, gRes, dRes, rRes] = await Promise.all([
        api.getMasteryOverview(studentId),
        api.getKnowledgeGraph(studentId),
        api.getDecayAnalytics(studentId),
        api.getRecommendations(studentId),
      ]);

      setMasteryOverview(mRes);
      setGraphData(gRes);
      setDecayData(dRes);
      setRecommendationsData(rRes);
    } catch (err) {
      console.warn('Backend API connecting or unavailable, loading profile cache:', err);
      // Graceful fallback to rich student profile data so the UI remains interactive
      const profile = STUDENT_PROFILES.find((p) => p.id === studentId) || STUDENT_PROFILES[0];
      if (profile) {
        setMasteryOverview({
          student_id: profile.id,
          student_name: profile.name,
          overall_mastery: profile.stats?.assessmentScore || 78,
          mastery_band: (profile.stats?.assessmentScore || 78) >= 80 ? 'Strong' : 'Stable',
          attendance_percentage: profile.stats?.attendance || 85,
          active_recommendations_count: profile.improvements?.length || 2,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [activeStudentId]);

  useEffect(() => {
    fetchStudentData(activeStudentId);
  }, [fetchStudentData, activeStudentId]);

  // Synchronize tracked syllabus topics from store
  const [currentDkTopics, setCurrentDkTopics] = useState(() => getDkTopics(activeStudentId));

  useEffect(() => {
    setCurrentDkTopics(getDkTopics(activeStudentId));
    const unsubscribe = onDkTopicsChange((updatedStudentId, topics) => {
      if (updatedStudentId === activeStudentId) {
        setCurrentDkTopics(topics);
      }
    });
    return unsubscribe;
  }, [activeStudentId]);

  // Track active PDF material for unified graph/roadmap display
  const [activeMaterial, setActiveMaterialState] = useState(
    () => getActiveMaterial(activeStudentId)
  );

  // Re-sync activeMaterial when student changes or when dk-topics-updated fires
  useEffect(() => {
    setActiveMaterialState(getActiveMaterial(activeStudentId));
    const handler = (e) => {
      if (!e.detail || e.detail.studentId === activeStudentId) {
        setActiveMaterialState(getActiveMaterial(activeStudentId));
      }
    };
    window.addEventListener('dk-topics-updated', handler);
    return () => window.removeEventListener('dk-topics-updated', handler);
  }, [activeStudentId]);

  // Overlay student's quiz-assessed scores and stability colors onto the Knowledge Graph.
  // When a PDF material is active: show PDF topics as graph nodes (replaces 5 demo nodes).
  // When no material: overlay quiz mastery scores onto the 5 demo nodes.
  const effectiveGraphData = React.useMemo(() => {
    // Build DK topic lookup map (id and name both as keys)
    const topicMap = new Map();
    if (currentDkTopics && currentDkTopics.length > 0) {
      currentDkTopics.forEach((t) => {
        if (t.name) topicMap.set(t.name.toLowerCase(), t);
        if (t.id) topicMap.set(t.id.toLowerCase(), t);
      });
    }

    // ── PDF-Material Mode: build graph from extracted PDF topics ──────────
    if (activeMaterial && activeMaterial.topics && activeMaterial.topics.length > 0) {
      const topics = activeMaterial.topics;
      const colCount = Math.min(4, topics.length);
      const nodes = topics.map((topic, idx) => {
        const col = idx % colCount;
        const row = Math.floor(idx / colCount);
        const pos = { x: 80 + col * 260, y: 100 + row * 220 };
        const dkTopic =
          topicMap.get((topic.name || '').toLowerCase()) ||
          topicMap.get((topic.id || '').toLowerCase());
        const mastery = dkTopic?.assessed ? (dkTopic.current_mastery ?? dkTopic.score ?? 0) : 0;
        const stability = dkTopic?.assessed ? (dkTopic.stability || 'At Risk') : 'At Risk';
        const assessed = Boolean(dkTopic?.assessed);
        return {
          id: topic.id,
          type: 'conceptNode',
          position: pos,
          data: {
            id: topic.id,
            label: topic.name,
            concept_id: topic.id,
            name: topic.name,
            slug: topic.id,
            unit_name: topic.unit || 'Syllabus',
            topic_name: topic.name,
            mastery_score: mastery,
            stability,
            days_since_practice: dkTopic?.days_since_practice ?? null,
            last_practiced: dkTopic?.last_practiced ?? null,
            prerequisites: [],
            downstream_impacts: [],
            is_root_gap: assessed && mastery < 50,
            is_impacted: false,
            assessed,
          },
        };

      });

      // Build linear chain edges between consecutive topics
      const edges = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const src = nodes[i];
        const tgt = nodes[i + 1];
        const srcMastery = src.data.mastery_score;
        const isCritical = src.data.assessed && srcMastery < 50;
        edges.push({
          id: `edge-${src.id}-${tgt.id}`,
          source: src.id,
          target: tgt.id,
          animated: isCritical,
          style: {
            strokeWidth: isCritical ? 3.5 : 2,
            stroke: isCritical ? '#ef4444' : '#475569',
          },
          label: isCritical ? 'blocks prereq' : 'prerequisite for',
        });
      }

      return { nodes, edges, engine: graphData?.engine || 'NetworkX Embedded' };
    }

    // ── Demo Mode: overlay quiz mastery onto 5 hardcoded demo nodes ────────
    if (!graphData?.nodes) return graphData;
    if (!currentDkTopics || currentDkTopics.length === 0) return graphData;

    const updatedNodes = graphData.nodes.map((node) => {
      const nodeNameKey = (node.data?.name || node.id || '').toLowerCase();
      const topic = topicMap.get(nodeNameKey);

      if (topic && topic.assessed) {
        return {
          ...node,
          data: {
            ...node.data,
            assessed: true,
            stability: topic.stability || node.data.stability,
            mastery_score: topic.current_mastery ?? topic.score ?? node.data.mastery_score,
            days_since_practice: topic.days_since_practice ?? 0,
          },
        };
      }
      return node;
    });

    return {
      ...graphData,
      nodes: updatedNodes,
    };
  }, [graphData, currentDkTopics, activeMaterial]);


  // Demo Storyboard Stage Changed
  const handleStageChanged = (newStage) => {
    setCurrentStage(newStage);
    fetchStudentData(activeStudentId);
  };

  // Switch Student Profile
  const handleSelectStudent = (studentId) => {
    setActiveStudentId(studentId);
    setLoading(true);
  };

  // Launch Quiz on a Concept
  const handleStartQuiz = (conceptId, conceptName = '') => {
    setSelectedConceptForQuiz(conceptId);
    setSelectedConceptNameForQuiz(conceptName);
    setActiveTab('quiz');
    setInspectedConcept(null);
  };

  // Quiz submission completed callback
  const handleQuizCompleted = () => {
    // Re-fetch all data to propagate updated mastery into graph & dashboard
    fetchStudentData(activeStudentId);
  };

  // Toggle Concept Completion (Task completion / incomplete)
  const handleToggleConceptComplete = async (conceptId, currentCompleted) => {
    try {
      await api.toggleConceptCompletion(activeStudentId, conceptId, !currentCompleted);
      await fetchStudentData(activeStudentId);
      if (inspectedConcept && (inspectedConcept.id === conceptId || inspectedConcept.concept_id === conceptId)) {
        setInspectedConcept((prev) =>
          prev
            ? {
                ...prev,
                mastery_score: !currentCompleted ? 90 : 0,
                stability: !currentCompleted ? 'Strong' : 'At Risk',
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to toggle concept completion:', err);
    }
  };

  // Handle Auth Success
  const handleAuthSuccess = (student) => {
    setCurrentStudent(student);
    setActiveStudentId(student.id);
    const name = student.nickname || student.name;
    setDisplayName(name);
    setLoading(true);
    fetchStudentData(student.id);
  };

  // Handle Logout
  const handleLogout = () => {
    api.logout();
    setCurrentStudent(null);
    setDisplayName(null);
    setActiveStudentId('student-demo-1');
    setLoading(true);
    fetchStudentData('student-demo-1');
  };

  const topRec = recommendationsData?.recommendations?.[0] || null;

  // Render Google OAuth callback handler when on the callback URL
  if (IS_GOOGLE_CALLBACK) {
    return (
      <GoogleAuthCallback
        onAuthSuccess={(student) => {
          handleAuthSuccess(student);
          // Navigate away from the callback URL to the app root
          window.history.replaceState({}, '', '/');
        }}
        onCancel={() => {
          window.history.replaceState({}, '', '/');
          setAuthModalOpen(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 antialiased selection:bg-teal-500/20 selection:text-teal-300">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeStudentId={activeStudentId}
        onSelectStudent={handleSelectStudent}
        currentStudent={currentStudent}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeMode={activeMode}
        onSwitchMode={handleModeSwitch}
        mentorProfile={MENTOR_PROFILE}
      />




      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchStudentData(activeStudentId)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-bold text-rose-200 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* ── Mentor Mode: Only show Mentor Dashboard ─────────────────── */}
        {activeMode === 'mentor' ? (
          <MentorDashboardPage />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center animate-spin">
              <Sparkles className="w-6 h-6 text-teal-400" />
            </div>
            <p className="font-mono text-xs text-slate-400 tracking-wider uppercase">
              Analyzing Knowledge Graph & Retention Trajectories...
            </p>
          </div>
        ) : (
          <>
            {/* ── Student Profile Tab ───────────────────────────────────── */}
            {activeTab === 'profile' && (
              <StudentProfilePage activeStudentId={activeStudentId} />
            )}

            {activeTab === 'faculty' && (
              <FacultyDashboardPage
                activeStudentId={activeStudentId}
                onSelectStudent={handleSelectStudent}
              />
            )}


            {activeTab === 'dashboard' && (
              <DashboardPage
                masteryOverview={masteryOverview}
                graphData={effectiveGraphData}
                topRecommendation={topRec}
                onSelectNode={setInspectedConcept}
                onStartQuiz={handleStartQuiz}
                onNavigateToTab={setActiveTab}
                displayName={displayName}
              />
            )}


            {activeTab === 'roadmap' && (
              <RoadmapPage
                activeStudentId={activeStudentId}
                onStartQuiz={handleStartQuiz}
                onInspectConcept={setInspectedConcept}
                onCurriculumUpdated={() => fetchStudentData(activeStudentId)}
                activeMaterial={activeMaterial}
              />
            )}


            {activeTab === 'graph' && (
              <GraphPage
                graphData={effectiveGraphData}
                onSelectNode={setInspectedConcept}
                selectedNodeId={inspectedConcept?.id}
              />
            )}

            {activeTab === 'decay' && (
              <DecayPage
                decayData={decayData}
                activeStudentId={activeStudentId}
                currentStudent={currentStudent}
                displayName={displayName}
                onRefresh={() => fetchStudentData(activeStudentId)}
                onStartQuiz={handleStartQuiz}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === 'quiz' && (
              <QuizPage
                conceptId={selectedConceptForQuiz}
                conceptName={selectedConceptNameForQuiz}
                activeStudentId={activeStudentId}
                onQuizCompleted={handleQuizCompleted}
                onNavigateToTab={setActiveTab}
                conceptsList={masteryOverview?.concepts || []}
              />
            )}

            {activeTab === 'brain-blast' && (
              <BrainBlastPage
                onNavigateToTab={setActiveTab}
                activeStudentId={activeStudentId}
              />
            )}

            {activeTab === 'help' && (
              <HelpSupportPage
                onNavigateToTab={setActiveTab}
                onStartQuiz={handleStartQuiz}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Reverse-Path Root Cause & Node Detail Slide-Over Inspector */}
      <NodeDetailDrawer
        concept={inspectedConcept}
        activeStudentId={activeStudentId}
        onClose={() => setInspectedConcept(null)}
        onStartQuiz={handleStartQuiz}
        onToggleComplete={handleToggleConceptComplete}
      />

      {/* Authentication & Privacy Deletion Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        currentStudent={currentStudent || { id: activeStudentId, name: masteryOverview?.student_name }}
        onDataDeleted={() => fetchStudentData(activeStudentId)}
      />

      {/* DOUBT AI Learning & Doubt Support Assistant */}
      <DoubtChatbot
        activeStudentId={activeStudentId}
        currentTab={activeTab}
        inspectedConcept={inspectedConcept}
        selectedConceptForQuiz={selectedConceptForQuiz}
        selectedConceptNameForQuiz={selectedConceptNameForQuiz}
        masteryOverview={masteryOverview}
      />

      {/* Cinematic Jarvis Hands-Free Voice Assistant with Talking Robot Avatar */}
      <JarvisAssistant
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeStudentId={activeStudentId}
        displayName={displayName || masteryOverview?.student_name}
        masteryOverview={masteryOverview}
        decayData={decayData}
        recommendationsData={recommendationsData}
        inspectedConcept={inspectedConcept}
      />

      {/* Footer & Responsible AI Notice */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-400">CampusInsight AI</span> — Unified Student Performance Analytics and Intervention Platform.
            <p className="text-[11px] text-slate-500 mt-1">
              "From Student Data to Smarter Intervention."
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-slate-400 hover:text-teal-400 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              <span>Student Privacy & Data Rights</span>
            </button>
            <div className="max-w-xs text-right text-[11px] text-slate-500 hidden sm:block">
              <strong className="text-slate-400">Responsible AI:</strong> Formative graph indicators, not deterministic cognitive labels.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
