import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Bot,
  X,
  Send,
  Trash2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Lightbulb,
  Maximize2,
  Minimize2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "👋 Hello! I'm **DOUBT**, your personal learning assistant.\n\nI can explain concepts simply, walk through code examples, generate practice questions, and help clarify anything you're studying. How can I help you today?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const getChatStorageKey = (studentId) => `learnGraph_chatHistory_${studentId || 'default'}`;

const loadStudentChatHistory = (studentId) => {
  if (!studentId) return [{ ...DEFAULT_WELCOME_MESSAGE }];
  try {
    const stored = localStorage.getItem(getChatStorageKey(studentId));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[DOUBT] Failed to load chat history for', studentId, err);
  }
  return [{ ...DEFAULT_WELCOME_MESSAGE }];
};

const saveStudentChatHistory = (studentId, msgs) => {
  if (!studentId) return;
  try {
    localStorage.setItem(getChatStorageKey(studentId), JSON.stringify(msgs));
  } catch (err) {
    console.warn('[DOUBT] Failed to save chat history for', studentId, err);
  }
};

export default function DoubtChatbot({
  activeStudentId,
  currentTab,
  inspectedConcept,
  selectedConceptForQuiz,
  selectedConceptNameForQuiz,
  masteryOverview,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState(() => loadStudentChatHistory(activeStudentId));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [error, setError] = useState(null);

  // Dynamic context: ONLY present if genuinely inspected or selected in the UI
  const activeConceptName =
    inspectedConcept?.name ||
    selectedConceptNameForQuiz ||
    (currentTab === 'quiz' && selectedConceptForQuiz ? selectedConceptForQuiz : null) ||
    null;

  const activeTopic = activeConceptName || null;
  const activeScore = inspectedConcept?.mastery_score;

  // Prompts adapt dynamically to selected topic or general learning
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    'Explain a concept simply',
    'Give me a code example',
    'Test me with a practice question',
    'Help me debug an error',
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Immediately isolate and load the newly authenticated/selected student's history
  useEffect(() => {
    const studentHistory = loadStudentChatHistory(activeStudentId);
    setMessages(studentHistory);
    setInput('');
    setError(null);
    setLoading(false);
  }, [activeStudentId]);

  // Persist messages whenever they change for the current student
  useEffect(() => {
    if (activeStudentId && messages.length > 0) {
      saveStudentChatHistory(activeStudentId, messages);
    }
  }, [messages, activeStudentId]);

  // Update prompt suggestions when topic changes
  useEffect(() => {
    if (activeTopic) {
      setSuggestedPrompts([
        `Explain ${activeTopic} simply`,
        `Give me a code example for ${activeTopic}`,
        `Test me with a practice question on ${activeTopic}`,
        'Why is this a prerequisite?',
      ]);
    } else {
      setSuggestedPrompts([
        'Explain a concept simply',
        'Give me a code example',
        'Test me with a practice question',
        'Help me debug an error',
      ]);
    }
  }, [activeTopic]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (textToSend = input) => {
    const trimmed = (textToSend || '').trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const recentHistory = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const learningContext = activeConceptName
        ? {
            current_tab: currentTab || 'dashboard',
            concept_id: inspectedConcept?.id || inspectedConcept?.concept_id || '',
            concept_name: activeConceptName,
            unit_name: inspectedConcept?.unit_name || '',
            topic_name: inspectedConcept?.topic_name || activeConceptName,
            mastery_score: typeof activeScore === 'number' ? activeScore : 0,
            stability: inspectedConcept?.stability || '',
            weak_concepts:
              masteryOverview?.concepts
                ?.filter((c) => c.stability === 'At Risk' || c.stability === 'Weakening' || c.is_bottleneck)
                ?.map((c) => c.name)
                ?.slice(0, 4) || [],
            syllabus_title: masteryOverview?.syllabus_title || '',
          }
        : null;

      const res = await api.sendDoubtMessage(
        trimmed,
        activeStudentId || null,
        activeTopic,
        recentHistory,
        learningContext
      );

      if (res && res.success && res.reply) {
        const botMsg = {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botMsg]);
        if (res.suggested_prompts && res.suggested_prompts.length > 0) {
          setSuggestedPrompts(res.suggested_prompts);
        }
      } else if (res && !res.success) {
        // Map backend error classifications
        if (res.error === 'GEMINI_API_KEY is not configured') {
          setError('DOUBT AI is not configured.');
        } else if (res.error?.toLowerCase().includes('timeout') || res.error?.toLowerCase().includes('too long')) {
          setError('DOUBT took too long to respond. Please try again.');
        } else if (res.error?.toLowerCase().includes('unavailable')) {
          setError('DOUBT AI service is temporarily unavailable.');
        } else {
          setError(res.error || 'DOUBT encountered an unexpected error. Please try again.');
        }
      } else if (res && res.reply) {
        // Fallback for direct reply string
        const botMsg = {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      console.error('[DOUBT AI Error]:', err);
      if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout') || err.response?.status === 504) {
        setError('DOUBT took too long to respond. Please try again.');
      } else if (!err.response) {
        setError('DOUBT backend is unavailable. Please make sure the backend is running.');
      } else if (err.response.status === 401 || err.response.data?.detail?.includes('configured') || err.response.data?.error === 'GEMINI_API_KEY is not configured') {
        setError('DOUBT AI is not configured.');
      } else if (err.response.status === 502 || err.response.status === 503 || err.response.data?.detail?.includes('unavailable')) {
        setError('DOUBT AI service is temporarily unavailable.');
      } else if (err.response.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('DOUBT encountered an unexpected error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        handleSend();
      }
    }
  };

  const handleClearChat = () => {
    const cleared = [
      {
        role: 'assistant',
        content: "Conversation cleared! 🧹 What topic or concept would you like to explore now?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(cleared);
    if (activeStudentId) {
      saveStudentChatHistory(activeStudentId, cleared);
    }
    setError(null);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to render basic markdown bold, lists, and code blocks
  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBuffer = [];
    const elements = [];

    lines.forEach((line, lineIdx) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-${lineIdx}`} className="my-2.5 rounded-xl bg-slate-950 border border-slate-800 p-3 overflow-x-auto text-[11px] font-mono text-teal-300">
              <pre>{codeBuffer.join('\n')}</pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={`h4-${lineIdx}`} className="font-bold text-xs text-teal-400 mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={`h3-${lineIdx}`} className="font-extrabold text-sm text-slate-100 mt-2.5 mb-1">
            {line.replace('## ', '')}
          </h3>
        );
        return;
      }

      // Bullet points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const bulletText = line.trim().substring(2);
        elements.push(
          <div key={`bullet-${lineIdx}`} className="flex items-start gap-1.5 my-0.5 text-xs text-slate-300 pl-1">
            <span className="text-teal-400 font-bold shrink-0">•</span>
            <span>{formatInlineText(bulletText)}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${lineIdx}`} className="flex items-start gap-1.5 my-0.5 text-xs text-slate-300 pl-1">
            <span className="text-teal-400 font-mono font-bold text-[11px] shrink-0">{numMatch[1]}.</span>
            <span>{formatInlineText(numMatch[2])}</span>
          </div>
        );
        return;
      }

      // Empty lines
      if (!line.trim()) {
        elements.push(<div key={`empty-${lineIdx}`} className="h-1.5" />);
        return;
      }

      // Regular text
      elements.push(
        <p key={`p-${lineIdx}`} className="my-1 text-xs leading-relaxed text-slate-200">
          {formatInlineText(line)}
        </p>
      );
    });

    if (codeBuffer.length > 0) {
      elements.push(
        <div key="code-end" className="my-2.5 rounded-xl bg-slate-950 border border-slate-800 p-3 overflow-x-auto text-[11px] font-mono text-teal-300">
          <pre>{codeBuffer.join('\n')}</pre>
        </div>
      );
    }

    return elements;
  };

  const formatInlineText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\`.*?\`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-950 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-teal-600 dark:text-teal-300 font-mono text-[10px]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
          {activeTopic && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-teal-500/30 text-teal-300 text-xs font-mono backdrop-blur-md shadow-xl animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Context: <strong>{activeTopic}</strong></span>
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="p-3.5 sm:px-4 sm:py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-2xl shadow-teal-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
            title="Ask DOUBT AI Learning Assistant"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-slate-950" />
              <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1" />
            </div>
            <span className="font-extrabold tracking-wide hidden sm:inline">DOUBT AI</span>
          </button>
        </div>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 shadow-2xl backdrop-blur-2xl bg-slate-950/95 border border-slate-800 rounded-3xl flex flex-col overflow-hidden ${
            isExpanded
              ? 'inset-4 sm:inset-10'
              : 'bottom-6 right-4 sm:right-6 w-[94vw] sm:w-[440px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Panel Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/40 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md shadow-teal-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-slate-100 tracking-tight">DOUBT</h3>
                  <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold border border-teal-500/30">
                    AI Tutor
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                  {activeTopic ? `📍 ${activeTopic}` : 'Personal AI Learning Assistant'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Clear Conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close DOUBT"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner: ONLY displayed when a specific concept is genuinely selected */}
          {activeTopic && (
            <div className="px-4 py-2 bg-teal-500/5 border-b border-teal-500/10 flex items-center justify-between text-[11px] font-mono text-teal-400">
              <div className="flex items-center gap-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                <span className="truncate">Active Topic: <strong>{activeTopic}</strong></span>
              </div>
              {activeScore !== undefined && activeScore !== null && (
                <span className="shrink-0 text-slate-400 ml-2">
                  Mastery: <strong>{activeScore.toFixed(0)}%</strong>
                </span>
              )}
            </div>
          )}

          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs transition-all ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-medium rounded-br-none shadow-md shadow-teal-500/10'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-lg'
                  }`}
                >
                  {/* Assistant Avatar & Header */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/80 text-[10px] text-teal-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span className="font-bold">DOUBT AI</span>
                      </div>
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className="text-slate-400 hover:text-teal-300 transition-colors flex items-center gap-1"
                        title="Copy Response"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-[9px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[9px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Body Content */}
                  {renderMessageContent(msg.content)}

                  {/* Timestamp */}
                  <span
                    className={`block text-[9px] mt-1.5 ${
                      msg.role === 'user' ? 'text-teal-950/70 text-right' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Thinking / Loading Indicator */}
            {loading && (
              <div className="flex items-start gap-2 animate-fade-in">
                <div className="w-7 h-7 rounded-xl bg-slate-900 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-bl-none p-3 bg-slate-900 border border-slate-800 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-slate-400 italic">DOUBT is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => handleSend(messages[messages.length - 1]?.content || '')}
                  className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-rose-200 ml-2 shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="px-3 py-2 border-t border-slate-900 bg-slate-950/70 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
            <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
            {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-teal-300 border border-slate-800 text-[10px] font-medium transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask a doubt..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-60"
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:hover:bg-teal-500 text-slate-950 font-bold transition-all shrink-0"
              title="Send Message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
