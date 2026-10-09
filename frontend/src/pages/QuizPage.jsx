import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  BookOpen,
  Layers,
  HelpCircle,
  RefreshCw,
  PlusCircle,
  FileCheck,
  TrendingDown,
  CheckSquare,
  Square,
  Layers as LayersIcon,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';
import { addOrUpdateDkTopic, getDkTopics, setActiveMaterial } from '../data/dkTopicsStore';

export default function QuizPage({
  conceptId,
  conceptName,
  conceptsList = [],
  activeStudentId = 'student-demo-1',
  onQuizCompleted,
  onNavigateToTab,
}) {
  const SESSION_KEY = `campusinsight_quiz_session_${activeStudentId}`;

  // Helper to load persisted session
  const getInitialSession = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed reading quiz session:', e);
    }
    return null;
  };

  const initialSession = getInitialSession();

  // Navigation & Workflow Stage: 'upload' -> 'topic_select' -> 'quiz' -> 'result'
  const [stage, setStage] = useState(() => initialSession?.stage || 'upload');

  // Study Material State
  const [uploadedFile, setUploadedFile] = useState(() => initialSession?.uploadedFile || null);
  const [materialData, setMaterialData] = useState(() => initialSession?.materialData || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Topic Selection State (Multi-selection from extracted PDF topics ONLY)
  const [selectedTopicIds, setSelectedTopicIds] = useState(() => {
    if (initialSession?.selectedTopicIds) {
      return new Set(initialSession.selectedTopicIds);
    }
    return new Set();
  });

  // Quiz Execution State
  const [questions, setQuestions] = useState(() => initialSession?.questions || []);
  const [cachedSetQuestions, setCachedSetQuestions] = useState(() => initialSession?.cachedSetQuestions || []);
  const [seenHashes, setSeenHashes] = useState(() => initialSession?.seenHashes || []);
  const [setNumber, setSetNumber] = useState(() => initialSession?.setNumber || 1);
  const [userAnswers, setUserAnswers] = useState(() => initialSession?.userAnswers || {});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [exhaustedNotice, setExhaustedNotice] = useState(null);

  // Result & Review State
  const [result, setResult] = useState(() => initialSession?.result || null);
  const fileInputRef = useRef(null);

  // Save active session to sessionStorage whenever core states change
  useEffect(() => {
    try {
      if (materialData && stage !== 'upload') {
        const sessionPayload = {
          stage,
          uploadedFile,
          materialData,
          selectedTopicIds: Array.from(selectedTopicIds),
          questions,
          cachedSetQuestions,
          seenHashes,
          setNumber,
          userAnswers,
          result,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
        setActiveMaterial(activeStudentId, materialData);
      } else if (stage === 'upload') {
        sessionStorage.removeItem(SESSION_KEY);
        setActiveMaterial(activeStudentId, null);
      }
    } catch (e) {
      console.warn('Failed persisting quiz session:', e);
    }
  }, [stage, uploadedFile, materialData, selectedTopicIds, questions, cachedSetQuestions, seenHashes, setNumber, userAnswers, result, SESSION_KEY, activeStudentId]);

  // Handle incoming props (e.g. from DK Tracker "Attend Quiz for {name}")
  useEffect(() => {
    if (conceptName) {
      // If we have material with this topic, select it
      if (materialData?.topics?.length) {
        const matched = materialData.topics.find(
          (t) => t.name.toLowerCase() === conceptName.toLowerCase() || t.id === conceptId
        );
        if (matched) {
          setSelectedTopicIds(new Set([matched.id]));
          setStage('topic_select');
          return;
        }
      }
      // If no materialData currently loaded, create a targeted virtual material for this topic
      const targetTopic = {
        id: conceptId || `top-${conceptName.toLowerCase().replace(/[^a-z0-9\-]+/g, '-')}`,
        name: conceptName,
        summary: `Targeted diagnostic quiz for: ${conceptName}`,
      };
      const vMaterial = {
        material_id: `mat-target-${Date.now()}`,
        filename: `${conceptName} Diagnostic`,
        topics: [targetTopic],
      };
      setMaterialData(vMaterial);
      setActiveMaterial(activeStudentId, vMaterial);
      setSelectedTopicIds(new Set([targetTopic.id]));
      setStage('topic_select');
    }
  }, [conceptId, conceptName, activeStudentId]);

  // ── Step 1: Upload Study Material ──────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents (.pdf) are supported for study material extraction.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadedFile({ name: file.name, size: file.size });

    try {
      const data = await api.uploadQuizMaterial(file);
      setMaterialData(data);
      setActiveMaterial(activeStudentId, data);
      // DO NOT automatically select any topic
      setSelectedTopicIds(new Set());
      setStage('topic_select');
      setSeenHashes([]);
      setExhaustedNotice(null);
      setQuestions([]);
      setUserAnswers({});
      setResult(null);
    } catch (err) {
      console.error('Failed to parse uploaded PDF:', err);
      setUploadError(
        err?.response?.data?.detail ||
          'Failed to extract text from PDF. Please verify the document contains readable text.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSampleMaterial = async () => {
    setUploading(true);
    setUploadError(null);

    try {
      const data = await api.loadSampleQuizMaterial();
      setMaterialData(data);
      setActiveMaterial(activeStudentId, data);
      setUploadedFile({ name: data.filename, size: data.text_length });
      // DO NOT automatically select any topic
      setSelectedTopicIds(new Set());
      setStage('topic_select');
      setSeenHashes([]);
      setExhaustedNotice(null);
      setQuestions([]);
      setUserAnswers({});
      setResult(null);
    } catch (err) {
      console.error('Failed to load sample material:', err);
      setUploadError('Failed to load sample study material.');
    } finally {
      setUploading(false);
    }
  };

  // ── Step 2: Topic Selection (Only user-selected topics) ─────────────────────
  const handleToggleTopic = (topic) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topic.id)) {
        next.delete(topic.id);
      } else {
        next.add(topic.id);
      }
      return next;
    });
  };

  const handleSelectAllTopics = () => {
    const allTopics = materialData?.topics || [];
    const allIds = new Set(allTopics.map((t) => t.id));
    setSelectedTopicIds(allIds);
  };

  const handleClearSelectedTopics = () => {
    setSelectedTopicIds(new Set());
  };

  // Computed list of selected topic objects
  const selectedTopicsList = useMemo(() => {
    const allTopics = materialData?.topics || [];
    return allTopics.filter((t) => selectedTopicIds.has(t.id));
  }, [materialData, selectedTopicIds]);

  // ── Step 3: Start Quiz for Selected Topics ─────────────────────────────────
  const handleStartQuiz = async (mode = 'initial', targetSetNum = 1) => {
    if (selectedTopicsList.length === 0 || !materialData) return;

    setLoadingQuestions(true);
    setQuizError(null);
    setExhaustedNotice(null);
    setUserAnswers({});

    try {
      const currentSeen = mode === 'initial' ? [] : seenHashes;
      const res = await api.generateQuizFromMaterial({
        material_id: materialData.material_id,
        topic_ids: selectedTopicsList.map((t) => t.id),
        topic_names: selectedTopicsList.map((t) => t.name),
        student_id: activeStudentId || 'student-demo-1',
        set_number: targetSetNum,
        mode,
        seen_hashes: currentSeen,
      });

      if (!res.has_more || !res.questions || res.questions.length === 0) {
        setExhaustedNotice(
          res.message ||
            'Not enough new questions can be generated from this material. Please upload more material or select another topic.'
        );
        setLoadingQuestions(false);
        return;
      }

      setQuestions(res.questions);
      setCachedSetQuestions(res.questions);
      setSetNumber(res.set_number || targetSetNum);

      const newHashes = res.questions.map((q) => q.hash).filter(Boolean);
      setSeenHashes((prev) => Array.from(new Set([...prev, ...newHashes])));

      setStage('quiz');
    } catch (err) {
      console.error('Failed to generate questions from material:', err);
      setQuizError(
        err?.response?.data?.detail || 'Failed to generate questions for the selected topics.'
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ── Answer Selection ───────────────────────────────────────────────────────
  const handleAnswerSelect = (questionId, optionKey) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  // ── Step 4: Submit Quiz & Persist Results ──────────────────────────────────
  const handleSubmitQuiz = async () => {
    let overallCorrect = 0;
    const feedbackItems = questions.map((q) => {
      const chosen = userAnswers[q.id];
      const isCorrect = chosen === q.correct_answer;
      if (isCorrect) overallCorrect++;
      return {
        question_id: q.id,
        topic_name: q.topic_name,
        question_text: q.question_text,
        chosen_option: chosen,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation,
        difficulty: q.difficulty,
      };
    });

    const rawOverallScore = questions.length > 0 ? (overallCorrect / questions.length) * 100 : 0;

    // Calculate score breakdown per topic
    const topicResults = selectedTopicsList.map((topic) => {
      const topicQs = questions.filter((q) => q.topic_name === topic.name || q.topic_id === topic.id);
      const relevantQs = topicQs.length > 0 ? topicQs : questions;
      const topicCorrect = relevantQs.filter((q) => userAnswers[q.id] === q.correct_answer).length;
      const topicScore = relevantQs.length > 0 ? (topicCorrect / relevantQs.length) * 100 : rawOverallScore;

      return {
        topic_id: topic.id,
        topic_name: topic.name,
        score: Math.round(topicScore),
        total_questions: relevantQs.length,
        correct_count: topicCorrect,
        percentage: Math.round(topicScore),
      };
    });

    const computedResult = {
      score: rawOverallScore,
      correctCount: overallCorrect,
      totalCount: questions.length,
      percentage: Math.round(rawOverallScore),
      topicResults,
      topicsString: selectedTopicsList.map((t) => t.name).join(', '),
      setNumber,
      feedback: feedbackItems,
      date: new Date().toLocaleDateString(),
    };

    setResult(computedResult);
    setStage('result');

    // 1. Update in local centralized DK Tracker store
    for (const tr of topicResults) {
      const origTopic = selectedTopicsList.find((t) => t.id === tr.topic_id || t.name === tr.topic_name);
      addOrUpdateDkTopic(activeStudentId, {
        id: tr.topic_id,
        name: tr.topic_name,
        unit: origTopic?.unit || null,
        score: tr.score,
        assessed: true,
      });
    }


    // 2. Persist to backend database SQLite via API
    try {
      await api.submitMaterialQuiz({
        student_id: activeStudentId,
        material_id: materialData?.material_id,
        material_name: materialData?.filename,
        overall_score: rawOverallScore,
        total_questions: questions.length,
        correct_count: overallCorrect,
        set_number: setNumber,
        topic_results: topicResults,
      });
    } catch (err) {
      console.warn('Backend material quiz persist error (fallback to local):', err);
    }

    // 3. Store in structured local quiz history
    try {
      const historyKey = 'campusinsight_quiz_history';
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
      existing.push({
        student_id: activeStudentId,
        topic_name: computedResult.topicsString,
        set_number: setNumber,
        score: overallCorrect,
        total_questions: questions.length,
        percentage: Math.round(rawOverallScore),
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(historyKey, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed saving quiz history:', e);
    }

    if (onQuizCompleted) {
      onQuizCompleted({
        topic: computedResult.topicsString,
        score: rawOverallScore,
        setNumber,
      });
    }
  };

  // ── Retake vs. Start Another Set ───────────────────────────────────────────
  const handleRetakeQuiz = () => {
    setQuestions([...cachedSetQuestions]);
    setUserAnswers({});
    setExhaustedNotice(null);
    setStage('quiz');
  };

  const handleStartAnotherSet = () => {
    const nextSet = setNumber + 1;
    handleStartQuiz('new_set', nextSet);
  };

  const handleResetToUpload = () => {
    setMaterialData(null);
    setUploadedFile(null);
    setSelectedTopicIds(new Set());
    setQuestions([]);
    setUserAnswers({});
    setResult(null);
    sessionStorage.removeItem(SESSION_KEY);
    setActiveMaterial(activeStudentId, null);
    setStage('upload');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Stage 1 — Upload Study Material
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === 'upload') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Diagnostic Assessment Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Upload Study Material
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Upload your lecture notes, textbook chapter, or course syllabus in PDF format.
            CampusInsight AI extracts the authentic syllabus topics and prepares targeted diagnostic quizzes.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-slate-900/60 border-2 border-dashed border-slate-700/80 hover:border-teal-500/60 rounded-3xl p-8 sm:p-12 text-center transition-all">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />

          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-4 text-teal-400">
            {uploading ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-200 mb-1">
            {uploading ? 'Analyzing Document & Extracting Topics...' : 'Upload PDF Document'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Drag and drop your study material PDF here, or browse files on your computer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>📄 Choose PDF File</span>
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={handleLoadSampleMaterial}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/40 text-slate-200 font-semibold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>⚡ Load Built-In Sample Notes</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Stage 2 — Topics Detected from PDF
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === 'topic_select') {
    const topics = materialData?.topics || [];
    const isReadyToStart = selectedTopicsList.length > 0;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <button
              onClick={handleResetToUpload}
              className="text-teal-400 hover:underline cursor-pointer"
            >
              Upload Material
            </button>
            <span>/</span>
            <span className="text-slate-200">Topic Selection</span>
          </div>

          <button
            onClick={handleResetToUpload}
            className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Upload Different Material
          </button>
        </div>

        {/* Header & Multi-select Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Document: {materialData?.filename || uploadedFile?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Topics Detected from Your PDF
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Only topics actually extracted from your uploaded PDF are shown. Select the topics you want to include in your quiz.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSelectAllTopics}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold cursor-pointer transition-all"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearSelectedTopics}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Selected Topics Chips Bar */}
        {selectedTopicsList.length > 0 && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-wrap items-center gap-2 animate-fade-in">
            <span className="text-xs font-mono font-bold text-blue-300 flex items-center gap-1.5 mr-2">
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              Selected Topics ({selectedTopicsList.length}):
            </span>
            {selectedTopicsList.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs font-bold"
              >
                <span>{t.name}</span>
                <button
                  type="button"
                  onClick={() => handleToggleTopic(t)}
                  className="text-blue-300 hover:text-white ml-1 text-sm leading-none"
                  title="Remove from selection"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Topics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {topics.map((t) => {
            const isSelected = selectedTopicIds.has(t.id);
            return (
              <div
                key={t.id}
                onClick={() => handleToggleTopic(t)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-blue-500/15 border-blue-500 shadow-md shadow-blue-500/20 ring-1 ring-blue-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleTopic(t);
                      }}
                      className="accent-blue-500 cursor-pointer w-4 h-4 rounded"
                    />
                    <h4 className="font-bold text-slate-100 text-sm">{t.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-6">{t.summary}</p>
              </div>
            );
          })}
        </div>

        {/* Action Panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Selected for Quiz:</span>
              <span className="text-sm font-bold text-blue-300">
                {selectedTopicsList.length > 0
                  ? selectedTopicsList.map((t) => t.name).join(', ')
                  : 'None selected (Check at least one topic above)'}
              </span>
            </div>
            <div className="text-[11px] text-teal-400 font-mono mt-0.5">
              {selectedTopicsList.length} topic{selectedTopicsList.length === 1 ? '' : 's'} chosen
            </div>
          </div>

          <button
            type="button"
            disabled={!isReadyToStart || loadingQuestions}
            onClick={() => handleStartQuiz('initial', 1)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              isReadyToStart && !loadingQuestions
                ? 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-slate-950 shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            {loadingQuestions ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Questions...</span>
              </>
            ) : (
              <>
                <span>Start Quiz ({selectedTopicsList.length})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {quizError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{quizError}</span>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Stage 3 — Interactive Quiz
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === 'quiz') {
    const answeredCount = Object.keys(userAnswers).length;
    const canSubmit = answeredCount === questions.length && questions.length > 0;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {selectedTopicsList.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40"
                >
                  {t.name}
                </span>
              ))}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Set {setNumber}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Grounded in: {materialData?.filename || 'Uploaded Document'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Progress: <b className="text-teal-300">{answeredCount}</b> / {questions.length}
            </span>
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-5">
          {questions.map((q, idx) => {
            const selectedOpt = userAnswers[q.id];
            return (
              <div
                key={q.id || idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-400">
                      Q{idx + 1}.
                    </span>
                    {q.topic_name && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {q.topic_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {q.difficulty || 'medium'}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                  {q.question_text}
                </p>

                {/* Options A, B, C, D */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {[
                    { key: 'A', text: q.option_a },
                    { key: 'B', text: q.option_b },
                    { key: 'C', text: q.option_c },
                    { key: 'D', text: q.option_d },
                  ].map((opt) => {
                    const isSelected = selectedOpt === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleAnswerSelect(q.id, opt.key)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-semibold'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isSelected
                              ? 'bg-teal-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 sticky bottom-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HelpCircle className="w-4 h-4 text-teal-400" />
            <span>
              {canSubmit
                ? 'All questions answered. Ready to submit!'
                : `Please answer all ${questions.length} questions before submitting.`}
            </span>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmitQuiz}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              canSubmit
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/20 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            Submit Quiz
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Stage 4 — Scoring & Detailed Review
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === 'result' && result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score Summary Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
            <span>{result.topicsString}</span>
            <span>•</span>
            <span className="text-teal-400 font-bold">Set {result.setNumber}</span>
          </div>

          <div>
            <div className="text-5xl font-extrabold text-slate-100 tracking-tight">
              {result.percentage}%
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Score: <b className="text-slate-200">{result.correctCount}</b> of{' '}
              <b className="text-slate-200">{result.totalCount}</b> Correct
            </p>
          </div>

          {/* Topic-Wise Breakdown */}
          {result.topicResults && result.topicResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-left max-w-lg mx-auto">
              {result.topicResults.map((tr) => (
                <div key={tr.topic_id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{tr.topic_name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {tr.correct_count}/{tr.total_questions} correct
                    </span>
                  </div>
                  <span className="font-mono text-sm font-extrabold text-teal-300">
                    {tr.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-800/80 max-w-sm mx-auto text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{result.correctCount} Correct</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <XCircle className="w-4 h-4" />
              <span>{result.totalCount - result.correctCount} Incorrect</span>
            </div>
          </div>
        </div>

        {/* Retake vs. Action Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          {/* Retake Quiz */}
          <button
            type="button"
            onClick={handleRetakeQuiz}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
          >
            <RotateCcw className="w-4 h-4 text-teal-400" />
            <span>Retake Quiz (Set {setNumber})</span>
          </button>

          {/* Start Another Set */}
          <button
            type="button"
            disabled={loadingQuestions}
            onClick={handleStartAnotherSet}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {loadingQuestions ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Generating Next Set...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>Start Another Set (Set {setNumber + 1})</span>
              </>
            )}
          </button>

          {/* View in DK Tracker */}
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('decay')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 shadow-md shadow-blue-500/10"
            >
              <TrendingDown className="w-4 h-4 text-blue-400" />
              <span>View in DK Tracker</span>
            </button>
          )}

          {/* Select Another Topic */}
          <button
            type="button"
            onClick={() => setStage('topic_select')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer bg-slate-800/80 border border-slate-700"
          >
            Select Another Topic
          </button>

          {/* Upload New Material */}
          <button
            type="button"
            onClick={handleResetToUpload}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Upload New Material
          </button>
        </div>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono">
            Question-by-Question Review
          </h3>

          {result.feedback.map((item, idx) => (
            <div
              key={item.question_id || idx}
              className={`p-4 rounded-2xl border ${
                item.is_correct
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-rose-500/5 border-rose-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Q{idx + 1}.
                  </span>
                  {item.topic_name && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                      {item.topic_name}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    item.is_correct
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {item.is_correct ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                {item.question_text}
              </p>

              <div className="space-y-1 text-xs font-mono mb-2">
                <p className="text-slate-400">
                  Your Answer: <b className={item.is_correct ? 'text-emerald-400' : 'text-rose-400'}>{item.chosen_option || 'None'}</b>
                </p>
                {!item.is_correct && (
                  <p className="text-emerald-400">
                    Correct Answer: <b>{item.correct_answer}</b>
                  </p>
                )}
              </div>

              {item.explanation && (
                <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                  <b className="text-slate-300">Explanation:</b> {item.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
