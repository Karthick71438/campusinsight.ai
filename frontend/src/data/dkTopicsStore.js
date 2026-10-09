/**
 * dkTopicsStore.js
 * Centralized store for DK Tracker (Knowledge Decay / Retention) topics.
 * 
 * DK Tracker is completely topic-driven:
 * - Predefined/static topics are NOT loaded by default (clean empty state).
 * - Topics are added dynamically when selected or attempted in the Quiz flow.
 * - Each topic maintains independent progress and decay curve.
 * - Taking a quiz with a repeated topic updates existing progress without duplicate entries.
 */

const STORAGE_PREFIX = 'learnGraph_dk_topics_';

/**
 * Computes estimated knowledge retention over elapsed days without practice.
 * Retention(t) = Floor + (Peak - Floor) * exp(-t / S)
 * Floor = 30.0%, S = 24.0 days
 */
export function calculateDecayRetention(peakMastery, daysSincePractice, s = 24.0, floor = 30.0) {
  if (daysSincePractice <= 0 || peakMastery <= 0) {
    return Math.round(peakMastery);
  }
  const effectiveFloor = peakMastery <= floor ? peakMastery * 0.5 : floor;
  const decayRange = peakMastery - effectiveFloor;
  const decayRatio = Math.exp(-daysSincePractice / s);
  const decayed = effectiveFloor + decayRange * decayRatio;
  return Math.round(Math.max(0, Math.min(100, decayed)) * 10) / 10;
}

/**
 * Classifies retention stability based on current retention score.
 */
export function classifyStability(score) {
  if (score >= 80) return 'Strong';
  if (score >= 65) return 'Stable';
  if (score >= 50) return 'Weakening';
  return 'At Risk';
}

/**
 * Generates time-series projection points for frontend Recharts curve.
 */
export function generateDecayCurve(peakMastery, currentDays = 0, maxDays = 30, step = 3) {
  const points = [];
  for (let day = 0; day <= maxDays; day += step) {
    const projScore = calculateDecayRetention(peakMastery, day);
    const actual = day <= currentDays && Math.abs(day - currentDays) < step ? projScore : null;
    points.push({
      day,
      projected_mastery: projScore,
      actual_mastery: actual,
      label: `Day ${day}`,
    });
  }
  return points;
}

/**
 * Active Uploaded Material Store (PDF uploaded in Quiz)
 */
export function getActiveMaterial(studentId = 'student-demo-1') {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`campusinsight_active_material_${studentId || 'default'}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setActiveMaterial(studentId = 'student-demo-1', materialData = null) {
  if (typeof window === 'undefined') return;
  const key = `campusinsight_active_material_${studentId || 'default'}`;
  if (materialData) {
    localStorage.setItem(key, JSON.stringify(materialData));
  } else {
    localStorage.removeItem(key);
  }
  // Dispatch update so DecayPage and App immediately react
  window.dispatchEvent(
    new CustomEvent('dk-topics-updated', {
      detail: { studentId, topics: getDkTopics(studentId) },
    })
  );
}

/**
 * Get all tracked topics for a student.
 * STRICT RULE: Only returns topics AFTER a PDF has been uploaded.
 * Returns empty array if no PDF has been uploaded yet.
 */
export function getDkTopics(studentId = 'student-demo-1') {
  if (typeof window === 'undefined') return [];
  try {
    const activeMat = getActiveMaterial(studentId);
    if (!activeMat || !activeMat.topics || activeMat.topics.length === 0) {
      return [];
    }

    const key = `${STORAGE_PREFIX}${studentId || 'default'}`;
    const raw = localStorage.getItem(key);
    const stored = raw ? JSON.parse(raw) : [];

    const storedMap = new Map();
    if (Array.isArray(stored)) {
      stored.forEach((st) => {
        if (st.name) storedMap.set(st.name.toLowerCase(), st);
        if (st.id) storedMap.set(st.id.toLowerCase(), st);
      });
    }

    return activeMat.topics.map((matTopic) => {
      const match =
        storedMap.get(matTopic.name.toLowerCase()) ||
        storedMap.get(matTopic.id.toLowerCase());
      if (match && match.assessed) {
        return {
          ...match,
          unit: matTopic.unit || match.unit || null,
        };
      }
      return {
        id: matTopic.id,
        concept_id: matTopic.id,
        name: matTopic.name,
        concept_name: matTopic.name,
        unit: matTopic.unit || null,
        summary: matTopic.summary || `Syllabus topic: ${matTopic.name}`,
        current_mastery: 0,
        peak_mastery: 0,
        days_since_practice: 0,
        stability: 'Unattempted',
        assessed: false,
        decay_curve: [],
        historical_points: [],
        attempts: 0,
      };

    });
  } catch (err) {
    console.error('Failed reading DK topics:', err);
    return [];
  }
}

/**
 * Save tracked topics for a student to localStorage and dispatch update event.
 */
export function saveDkTopics(studentId = 'student-demo-1', topics = []) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_PREFIX}${studentId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(topics));
    window.dispatchEvent(
      new CustomEvent('dk-topics-updated', {
        detail: { studentId, topics },
      })
    );
  } catch (err) {
    console.error('Failed saving DK topics:', err);
  }
}

/**
 * Clear all tracked topics for a student (resets to empty state).
 */
export function clearDkTopics(studentId = 'student-demo-1') {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_PREFIX}${studentId || 'default'}`;
    localStorage.removeItem(key);
    localStorage.removeItem(`campusinsight_active_material_${studentId || 'default'}`);
    window.dispatchEvent(
      new CustomEvent('dk-topics-updated', {
        detail: { studentId, topics: [] },
      })
    );
  } catch (err) {
    console.error('Failed clearing DK topics:', err);
  }
}

/**
 * Subscribe to dk-topics-updated events across components.
 */
export function onDkTopicsChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    callback(e.detail?.studentId, e.detail?.topics || []);
  };
  window.addEventListener('dk-topics-updated', handler);
  return () => window.removeEventListener('dk-topics-updated', handler);
}

/**
 * Add a new topic or update an existing one without creating duplicates.
 * 
 * If topic exists:
 * - Updates score, peak, retention, and decay curve.
 * - Does NOT create a duplicate entry.
 * 
 * If topic is new:
 * - Adds to the topic list with generated decay curve.
 */
export function addOrUpdateDkTopic(
  studentId = 'student-demo-1',
  {
    id,
    name,
    unit = null,
    summary = '',
    score = null,
    assessed = false,
    days_since_practice = 0,
  }
) {
  if (!name || typeof name !== 'string') return getDkTopics(studentId);
  const cleanName = name.trim();
  if (!cleanName) return getDkTopics(studentId);

  const topics = [...getDkTopics(studentId)];
  const normalized = cleanName.toLowerCase();

  const existingIdx = topics.findIndex(
    (t) => t.name.trim().toLowerCase() === normalized || (id && t.id === id)
  );

  const nowIso = new Date().toISOString();

  if (existingIdx >= 0) {
    // ── Update existing topic (NO DUPLICATE) ──
    const existing = topics[existingIdx];
    const isNowAssessed = existing.assessed || assessed;
    const newScore = score != null ? Math.round(score) : (existing.assessed ? existing.current_mastery : 0);
    const peak = Math.max(existing.peak_mastery || 0, newScore);
    const days = days_since_practice != null
      ? days_since_practice
      : (assessed ? 0 : (existing.days_since_practice || 0));
    const retention = isNowAssessed ? calculateDecayRetention(peak, days) : 0;

    const history = [...(existing.historical_points || [])];
    const newAttemptCount = (existing.attempts || 0) + (assessed && score != null ? 1 : 0);
    if (assessed && score != null) {
      history.push({
        attempt: newAttemptCount,
        score: Math.round(score),
        date: nowIso,
        label: `Attempt ${newAttemptCount}`
      });
    }

    topics[existingIdx] = {
      ...existing,
      unit: unit || existing.unit || null,
      summary: summary || existing.summary,
      current_mastery: retention,
      peak_mastery: peak,
      days_since_practice: days,
      stability: isNowAssessed ? classifyStability(retention) : 'Unattempted',
      assessed: isNowAssessed,
      decay_curve: isNowAssessed ? generateDecayCurve(peak, days) : [],
      historical_points: history,
      last_practiced: assessed ? nowIso : existing.last_practiced,
      attempts: newAttemptCount,
    };
  } else {
    // ── Add new topic ──
    const topicId = id || `top-${cleanName.toLowerCase().replace(/[^a-z0-9\-]+/g, '-')}`;
    const isNowAssessed = Boolean(assessed && score != null);
    const initScore = isNowAssessed ? Math.round(score) : 0;
    const peak = initScore;
    const days = days_since_practice || 0;
    const retention = isNowAssessed ? calculateDecayRetention(peak, days) : 0;

    topics.push({
      id: topicId,
      concept_id: topicId, // compatibility with DecayChart
      name: cleanName,
      concept_name: cleanName, // compatibility with DecayChart
      unit: unit || null,
      summary: summary || `Tracked topic: ${cleanName}`,
      current_mastery: retention,
      peak_mastery: peak,
      days_since_practice: days,
      stability: isNowAssessed ? classifyStability(retention) : 'Unattempted',
      assessed: isNowAssessed,
      decay_curve: isNowAssessed ? generateDecayCurve(peak, days) : [],
      historical_points: isNowAssessed ? [{ attempt: 1, score: initScore, date: nowIso, label: 'Attempt 1' }] : [],
      last_practiced: isNowAssessed ? nowIso : null,
      attempts: isNowAssessed ? 1 : 0,
    });
  }

  saveDkTopics(studentId, topics);
  return topics;
}

/**
 * Adds multiple topics in one operation (e.g. when multiple topics are selected in Quiz)
 * Prevents duplicates.
 */
export function addMultipleDkTopics(studentId = 'student-demo-1', topicsList = []) {
  if (!Array.isArray(topicsList) || topicsList.length === 0) return getDkTopics(studentId);

  let current = getDkTopics(studentId);
  for (const t of topicsList) {
    if (!t) continue;
    const name = typeof t === 'string' ? t : t.name;
    const summary = typeof t === 'object' ? t.summary : '';
    const unit = typeof t === 'object' ? t.unit : null;
    const id = typeof t === 'object' ? t.id : null;
    const score = typeof t === 'object' && t.score != null ? t.score : null;
    const assessed = typeof t === 'object' && t.assessed ? true : false;
    current = addOrUpdateDkTopic(studentId, { id, name, unit, summary, score, assessed });
  }
  return current;
}


/**
 * Interactive memory simulator for a single topic.
 * Adjusts simulated practice gap and recalculates retention and decay curve.
 */
export function simulateTopicGap(studentId = 'student-demo-1', topicId, simDays) {
  const topics = [...getDkTopics(studentId)];
  const idx = topics.findIndex((t) => t.id === topicId || t.name === topicId);
  if (idx < 0) return null;

  const topic = topics[idx];
  const peak = topic.peak_mastery || 70;
  const simulatedRetention = calculateDecayRetention(peak, simDays);
  const updatedCurve = generateDecayCurve(peak, simDays);

  topics[idx] = {
    ...topic,
    current_mastery: simulatedRetention,
    days_since_practice: simDays,
    stability: classifyStability(simulatedRetention),
    decay_curve: updatedCurve,
  };

  saveDkTopics(studentId, topics);
  return topics[idx];
}
