import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach Authorization header if token exists
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('learnGraph_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Health & System
  getHealth: async () => {
    const res = await client.get('/health');
    return res.data;
  },

  // Authentication
  register: async ({ name, email, password, role, nickname }) => {
    const res = await client.post('/auth/register', { name, email, password, role, nickname });
    if (res.data?.token) {
      localStorage.setItem('learnGraph_token', res.data.token);
    }
    if (res.data?.student) {
      const s = res.data.student;
      localStorage.setItem('learnGraph_student_id', s.id);
      localStorage.setItem('learnGraph_display_name', s.nickname || s.name);
    }
    return res.data;
  },

  login: async ({ email, password }) => {
    const res = await client.post('/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('learnGraph_token', res.data.token);
    }
    if (res.data?.student) {
      const s = res.data.student;
      localStorage.setItem('learnGraph_student_id', s.id);
      localStorage.setItem('learnGraph_display_name', s.nickname || s.name);
    }
    return res.data;
  },

  getMe: async () => {
    const res = await client.get('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('learnGraph_token');
    localStorage.removeItem('learnGraph_student_id');
    localStorage.removeItem('learnGraph_display_name');
  },

  // Google OAuth — send authorization code to backend for secure exchange
  googleAuthCode: async ({ code, redirect_uri, state }) => {
    const res = await client.post('/auth/google', { code, redirect_uri, state });
    if (res.data?.token) {
      localStorage.setItem('learnGraph_token', res.data.token);
    }
    if (res.data?.student) {
      const s = res.data.student;
      localStorage.setItem('learnGraph_student_id', s.id);
      localStorage.setItem('learnGraph_display_name', s.nickname || s.name);
    }
    return res.data;
  },

  // Google OAuth — get server-configured authorization URL
  getGoogleAuthUrl: async (redirectUri = null) => {
    const params = redirectUri ? { redirect_uri: redirectUri } : {};
    const res = await client.get('/auth/google/url', { params });
    return res.data;
  },

  // Student Profile & Mastery
  getStudent: async (studentId = 'student-demo-1') => {
    const res = await client.get(`/students/${studentId}`);
    return res.data;
  },

  getMasteryOverview: async (studentId = 'student-demo-1', syllabusId = null) => {
    const url = syllabusId
      ? `/students/${studentId}/mastery?syllabus_id=${syllabusId}`
      : `/students/${studentId}/mastery`;
    const res = await client.get(url);
    return res.data;
  },

  // Knowledge Graph
  getKnowledgeGraph: async (studentId = 'student-demo-1', syllabusId = null) => {
    const url = syllabusId
      ? `/students/${studentId}/graph?syllabus_id=${syllabusId}`
      : `/students/${studentId}/graph`;
    const res = await client.get(url);
    return res.data;
  },

  // Reverse-Path Root Cause Analyzer
  getWeakPath: async (studentId = 'student-demo-1', conceptId) => {
    const res = await client.get(`/students/${studentId}/weak-path/${conceptId}`);
    return res.data;
  },

  // Knowledge Decay
  getDecayAnalytics: async (studentId = 'student-demo-1', syllabusId = null) => {
    const url = syllabusId
      ? `/students/${studentId}/decay?syllabus_id=${syllabusId}`
      : `/students/${studentId}/decay`;
    const res = await client.get(url);
    return res.data;
  },

  // Download Learning Progress Report (PDF)
  downloadProgressReport: async (studentId = 'student-demo-1') => {
    const res = await client.get(`/students/${studentId}/report/pdf`, {
      responseType: 'blob',
    });
    return res;
  },

  // Get Learning Progress Report Data (JSON)
  getProgressReportData: async (studentId = 'student-demo-1') => {
    const res = await client.get(`/students/${studentId}/report/data`);
    return res.data;
  },

  // Explainable Recommendations
  getRecommendations: async (studentId = 'student-demo-1') => {
    const res = await client.get(`/students/${studentId}/recommendations`);
    return res.data;
  },

  // Syllabus & Adaptive Roadmap
  uploadSyllabus: async (studentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post(`/students/${studentId}/syllabus/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  loadSampleSyllabus: async (studentId = 'student-demo-1') => {
    const res = await client.post(`/students/${studentId}/syllabus/load-sample`);
    return res.data;
  },

  getSyllabi: async (studentId = 'student-demo-1') => {
    const res = await client.get(`/students/${studentId}/syllabus`);
    return res.data;
  },

  getRoadmap: async (studentId = 'student-demo-1') => {
    const res = await client.get(`/students/${studentId}/roadmap`);
    return res.data;
  },

  // Quiz Engine
  getQuestionsByConcept: async (conceptId, params = {}) => {
    const res = await client.get(`/questions/${conceptId}`, { params });
    return res.data;
  },

  uploadQuizMaterial: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post('/quiz/upload-material', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  loadSampleQuizMaterial: async () => {
    const res = await client.post('/quiz/load-sample-material');
    return res.data;
  },

  generateQuizFromMaterial: async (payload) => {
    const res = await client.post('/quiz/generate-from-material', payload);
    return res.data;
  },

  submitQuiz: async (studentId, conceptId, answers, confidence = 'medium', quizSetId = null) => {
    const res = await client.post('/quiz/submit', {
      student_id: studentId,
      concept_id: conceptId,
      answers,
      confidence,
      quiz_set_id: quizSetId,
    });
    return res.data;
  },

  submitMaterialQuiz: async (payload) => {
    const res = await client.post('/quiz/submit-material-quiz', payload);
    return res.data;
  },

  getStudentDkTopics: async (studentId = 'student-demo-1') => {
    const res = await client.get(`/quiz/student-dk-topics/${studentId}`);
    return res.data;
  },

  // Task & Concept Completion
  toggleConceptCompletion: async (studentId, conceptId, completed = true, score = null) => {
    const res = await client.post(`/students/${studentId}/concepts/${conceptId}/toggle-complete`, {
      completed,
      score,
    });
    return res.data;
  },

  // Privacy & Data Deletion
  deleteStudentData: async (studentId) => {
    const res = await client.delete(`/students/${studentId}/data`);
    return res.data;
  },

  // Demo Controls
  getDemoStages: async () => {
    const res = await client.get('/demo/stages');
    return res.data;
  },

  setDemoStage: async (stage) => {
    const res = await client.post('/demo/set-stage', { stage });
    return res.data;
  },

  simulateGap: async (studentId = 'student-demo-1', conceptId = 'concept-recursion', days = 21) => {
    const res = await client.post(`/demo/simulate-gap?student_id=${studentId}&concept_id=${conceptId}&days=${days}`);
    return res.data;
  },

  // DOUBT AI Assistant
  sendDoubtMessage: async (message, studentId = null, activeTopic = null, conversationHistory = [], context = null) => {
    let payload;
    if (typeof message === 'object' && !Array.isArray(message)) {
      payload = message;
    } else if (Array.isArray(message)) {
      const messages = message;
      const ctx = studentId || {};
      const lastMsg = messages[messages.length - 1]?.content || '';
      const hist = messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      payload = {
        message: lastMsg,
        student_id: ctx.student_id || null,
        active_topic: ctx.concept_name || ctx.topic_name || activeTopic || null,
        conversation_history: hist,
        context: ctx,
      };
    } else {
      payload = {
        message,
        student_id: studentId || null,
        active_topic: activeTopic || null,
        conversation_history: conversationHistory || [],
        context: context || null,
      };
    }

    const res = await client.post('/ai/chat', payload);
    return res.data;
  },

  // CampusInsight AI Core Endpoints
  getCampusKPIs: async (params = {}) => {
    const res = await client.get('/campus/kpis', { params });
    return res.data;
  },

  getCampusStudents: async (params = {}) => {
    const res = await client.get('/campus/students', { params });
    return res.data;
  },

  getCampusSubjectPerformance: async () => {
    const res = await client.get('/campus/subject-performance');
    return res.data;
  },

  getCampusAttendanceVsPerformance: async () => {
    const res = await client.get('/campus/attendance-vs-performance');
    return res.data;
  },

  getCampusInsights: async () => {
    const res = await client.get('/campus/insights');
    return res.data;
  },

  getCampusInterventions: async () => {
    const res = await client.get('/campus/interventions');
    return res.data;
  },
};

