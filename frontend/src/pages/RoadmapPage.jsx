import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  FileText,
  CheckCircle,
  Play,
  GitBranch,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import ActionBadge from '../components/ActionBadge';
import { getDkTopics } from '../data/dkTopicsStore';

export default function RoadmapPage({
  activeStudentId,
  onStartQuiz,
  onInspectConcept,
  onCurriculumUpdated,
  activeMaterial,
}) {
  const [collapsedUnits, setCollapsedUnits] = useState({});
  // Local completion overrides (from user manual toggle)
  const [materialConceptOverrides, setMaterialConceptOverrides] = useState({});
  // Counter to force re-render when dk-topics-updated event fires
  const [topicsVersion, setTopicsVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setTopicsVersion((v) => v + 1);
    };
    window.addEventListener('dk-topics-updated', handleUpdate);
    return () => window.removeEventListener('dk-topics-updated', handleUpdate);
  }, []);

  const toggleUnit = (unitKey) => {
    setCollapsedUnits((prev) => ({
      ...prev,
      [unitKey]: !prev[unitKey],
    }));
  };

  const handleToggleTaskCompletion = (conceptId, currentStatus) => {
    const nextCompleted = currentStatus !== 'Completed';
    setMaterialConceptOverrides((prev) => ({
      ...prev,
      [conceptId]: nextCompleted ? 'Completed' : 'Current',
    }));
    if (onCurriculumUpdated) {
      onCurriculumUpdated();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Current':
        return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
      case 'Needs Review':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'At Risk':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'Not Attempted':
      default:
        return 'text-slate-400 bg-slate-800/60 border-slate-700/50';
    }
  };

  // Build the Roadmap strictly from the active uploaded PDF material and Decay Tracker dataset
  const roadmapData = useMemo(() => {
    if (!activeMaterial || !activeMaterial.topics || activeMaterial.topics.length === 0) {
      return null;
    }

    // Single shared dataset: topics from Decay Tracker store
    const dkTopics = getDkTopics(activeStudentId);
    if (!dkTopics || dkTopics.length === 0) {
      return null;
    }

    // Check if the uploaded PDF provided meaningful unit/module headings
    const hasMeaningfulUnits = dkTopics.some(
      (t) =>
        t.unit &&
        typeof t.unit === 'string' &&
        t.unit.trim().length > 0 &&
        !t.unit.toLowerCase().startsWith('syllabus topics')
    );

    // Group topics into units based strictly on PDF hierarchy
    const unitGroups = [];
    if (hasMeaningfulUnits) {
      const groupMap = new Map();
      dkTopics.forEach((t) => {
        const uTitle = (t.unit && t.unit.trim()) || 'Course Topics';
        if (!groupMap.has(uTitle)) {
          groupMap.set(uTitle, []);
        }
        groupMap.get(uTitle).push(t);
      });

      let uIdx = 1;
      groupMap.forEach((topicsInUnit, uTitle) => {
        unitGroups.push({
          unit_number: uIdx++,
          title: uTitle,
          topics: topicsInUnit,
        });
      });
    } else {
      // PDF has a flat topic structure — show single clean curriculum unit
      const cleanSubjectTitle = activeMaterial.filename
        ? activeMaterial.filename.replace(/\.pdf$/i, '').replace(/_/g, ' ')
        : 'Course Curriculum';
      unitGroups.push({
        unit_number: 1,
        title: cleanSubjectTitle,
        topics: dkTopics,
      });
    }

    let totalConceptsCount = 0;
    let completedCount = 0;
    let needsReviewCount = 0;

    const units = unitGroups.map((uGroup) => {
      let unitTotal = 0;
      let unitCompleted = 0;

      const concepts = uGroup.topics.map((t, idx) => {
        totalConceptsCount += 1;
        unitTotal += 1;

        const assessed = Boolean(t.assessed);
        const score = assessed ? (t.current_mastery ?? t.score ?? 0) : 0;
        const stability = assessed ? (t.stability || 'At Risk') : 'Unattempted';

        let status = 'Not Attempted';
        let action_type = 'PRACTICE';
        let action_explanation = 'Topic from your uploaded syllabus. Attend quiz to establish baseline mastery.';

        if (assessed) {
          if (score >= 75) {
            status = 'Completed';
            action_type = 'CHALLENGE';
            action_explanation = `Mastery at ${Math.round(score)}% (${stability}). Solid foundation.`;
            completedCount += 1;
            unitCompleted += 1;
          } else if (score >= 50) {
            status = 'Current';
            action_type = 'PRACTICE';
            action_explanation = `Mastery at ${Math.round(score)}% (${stability}). Continue practice to reinforce.`;
          } else {
            status = 'Needs Review';
            action_type = 'REVIEW';
            action_explanation = `Low mastery at ${Math.round(score)}% (${stability}). Targeted revision recommended.`;
            needsReviewCount += 1;
          }
        }

        // Apply student manual toggle override
        const override = materialConceptOverrides[t.id];
        if (override) {
          if (override === 'Completed' && status !== 'Completed') {
            completedCount += 1;
            unitCompleted += 1;
          } else if (override !== 'Completed' && status === 'Completed') {
            completedCount = Math.max(0, completedCount - 1);
            unitCompleted = Math.max(0, unitCompleted - 1);
          }
          status = override;
        }

        return {
          concept_id: t.id,
          name: t.name,
          unit_name: uGroup.title,
          topic_name: t.name,
          order_index: idx + 1,
          mastery_score: score,
          stability,
          status,
          action_type,
          action_explanation,
          assessed,
        };
      });

      const unitCompletion = unitTotal > 0 ? Math.round((unitCompleted / unitTotal) * 100) : 0;

      return {
        unit_number: uGroup.unit_number,
        title: uGroup.title,
        completion_percentage: unitCompletion,
        topics: [
          {
            title: 'Syllabus Topics',
            concepts,
          },
        ],
      };
    });

    const overallProgress =
      totalConceptsCount > 0 ? Math.round((completedCount / totalConceptsCount) * 100) : 0;

    const syllabusTitle = activeMaterial.filename
      ? activeMaterial.filename.replace(/\.pdf$/i, '').replace(/_/g, ' ')
      : 'Course Curriculum';

    return {
      student_id: activeStudentId,
      syllabus_title: syllabusTitle,
      overall_progress: overallProgress,
      total_concepts: totalConceptsCount,
      completed_concepts: completedCount,
      needs_review_count: needsReviewCount,
      units,
    };
  }, [activeMaterial, activeStudentId, materialConceptOverrides, topicsVersion]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-teal-400" />
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Adaptive Curriculum Roadmap
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Auto-structured from your uploaded syllabus in Quiz. Concepts dynamically adapt using your real-time quiz performance
            and memory retention signals.
          </p>
        </div>

        {/* Source Badge (Quiz is the sole entry point) */}
        {activeMaterial ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <FileText className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Active Syllabus Source
              </span>
              <span className="font-bold text-slate-200 text-xs truncate max-w-xs" title={activeMaterial.filename}>
                {activeMaterial.filename}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span>Syllabus pending upload in Quiz</span>
          </div>
        )}
      </div>

      {/* Progress Metric Banner */}
      {roadmapData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Curriculum Title
            </span>
            <div className="font-extrabold text-slate-100 text-sm truncate" title={roadmapData.syllabus_title}>
              {roadmapData.syllabus_title}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Curriculum Mastery
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-400 font-mono">
                {roadmapData.overall_progress}%
              </span>
              <span className="text-xs text-slate-500">overall</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Units &amp; Topics
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-200 font-mono">
                {roadmapData.total_concepts}
              </span>
              <span className="text-xs text-slate-500">
                topics across {roadmapData.units?.length || 1} {roadmapData.units?.length === 1 ? 'unit' : 'units'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Adaptive Next Step
            </span>
            <div className="font-bold text-teal-300 text-xs truncate">
              {roadmapData.units?.[0]?.topics?.[0]?.concepts?.[0]?.name
                ? `Focus: ${roadmapData.units[0].topics[0].concepts[0].name}`
                : 'Ready for assessment'}
            </div>
          </div>
        </div>
      )}

      {/* Empty State: Shown strictly when no PDF has been uploaded yet */}
      {!roadmapData || !roadmapData.units || roadmapData.units.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto space-y-5 shadow-xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400 shadow-lg shadow-teal-500/10">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-100">
              No syllabus topics yet.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Upload a PDF in Quiz to create your learning roadmap.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => (onStartQuiz ? onStartQuiz() : null)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Go to Quiz &amp; Upload PDF</span>
            </button>
          </div>
        </div>
      ) : (
        /* Units & Topics List */
        <div className="space-y-6">
          {roadmapData.units.map((unit) => {
            const unitKey = `unit-${unit.unit_number}`;
            const isCollapsed = collapsedUnits[unitKey];
            const conceptCount = unit.topics.reduce((acc, t) => acc + t.concepts.length, 0);

            return (
              <div
                key={unitKey}
                className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden backdrop-blur-xl transition-all shadow-sm"
              >
                {/* Unit Header Accordion */}
                <div
                  onClick={() => toggleUnit(unitKey)}
                  className="p-6 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="p-1 rounded-lg text-slate-400 hover:text-slate-100">
                      {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wider">
                          Unit {unit.unit_number}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">
                          {conceptCount} {conceptCount === 1 ? 'topic' : 'topics'}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-0.5">
                        {unit.title}
                      </h2>
                    </div>
                  </div>

                  {/* Unit Progress Gauge */}
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right">
                      <div className="font-mono text-xs font-bold text-slate-200">
                        {unit.completion_percentage}% Mastered
                      </div>
                      <div className="w-28 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${unit.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topics & Concepts Inside Unit */}
                {!isCollapsed && (
                  <div className="p-6 space-y-6">
                    {unit.topics.map((topic, tIdx) => (
                      <div key={topic.title || tIdx} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {topic.title}
                          </h4>
                        </div>

                        {/* Concept Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {topic.concepts.map((concept) => (
                            <div
                              key={concept.concept_id}
                              className="group relative p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-teal-500/50 hover:bg-slate-900/60 transition-all flex flex-col justify-between"
                            >
                              <div>
                                {/* Status & Action Badge */}
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${getStatusColor(
                                      concept.status
                                    )}`}
                                  >
                                    {concept.status}
                                  </span>
                                  <ActionBadge actionType={concept.action_type} size="xs" />
                                </div>

                                {/* Concept Title */}
                                <h5 className="font-bold text-sm text-slate-100 group-hover:text-teal-300 transition-colors mb-1">
                                  {concept.name}
                                </h5>

                                {/* Mastery Rating Bar */}
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 my-2">
                                  <span>{concept.assessed ? 'Mastery:' : 'Status:'}</span>
                                  <span className="font-bold text-slate-200">
                                    {concept.assessed
                                      ? `${concept.mastery_score}% (${concept.stability})`
                                      : 'Not Attempted'}
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
                                  {concept.assessed ? (
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        concept.mastery_score >= 75
                                          ? 'bg-emerald-400'
                                          : concept.mastery_score >= 50
                                          ? 'bg-teal-400'
                                          : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${concept.mastery_score}%` }}
                                    />
                                  ) : (
                                    <div className="h-full bg-slate-700/40 w-full" />
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                                  {concept.action_explanation}
                                </p>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                                <button
                                  type="button"
                                  onClick={() => onStartQuiz(concept.concept_id, concept.name)}
                                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-teal-500/15 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>{concept.assessed ? 'Practice' : 'Attend Quiz'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskCompletion(concept.concept_id, concept.status)}
                                  title={
                                    concept.status === 'Completed'
                                      ? 'Mark Incomplete'
                                      : 'Mark as Completed / Mastered'
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg border font-bold text-[11px] transition-all flex items-center gap-1 ${
                                    concept.status === 'Completed'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                                      : 'bg-slate-900 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40 border-slate-800'
                                  }`}
                                >
                                  <CheckCircle
                                    className={`w-3.5 h-3.5 ${
                                      concept.status === 'Completed' ? 'text-emerald-400' : ''
                                    }`}
                                  />
                                  <span className="hidden sm:inline">
                                    {concept.status === 'Completed' ? 'Done' : 'Complete'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onInspectConcept &&
                                    onInspectConcept({ ...concept, id: concept.concept_id })
                                  }
                                  title="Inspect Reverse Path Root Cause"
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] transition-colors"
                                >
                                  <GitBranch className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
