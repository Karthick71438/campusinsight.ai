/**
 * studentProfiles.js
 * Single source of truth for all 5 built-in demo students and the Mentor profile.
 *
 * All dashboard KPIs, trend charts, subject breakdowns, mentor monitoring,
 * roll number searches, and PDF report data are derived directly from this file.
 *
 * Students:
 *   1. Deepika  → CSBS001
 *   2. Kavya    → CSBS002
 *   3. Santhosh → CSBS003
 *   4. Karthik  → CSBS004
 *   5. Mukesh   → CSBS005
 *
 * Mentor:
 *   Dr. Arun Kumar (Associate Professor & Student Mentor)
 */

// ─── Default SVG Avatars for Students and Mentor ─────────────────────────────
const AVATAR_DEEPIKA = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='bgD' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%238b5cf6'/><stop offset='100%' stop-color='%23ec4899'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23bgD)'/><circle cx='60' cy='46' r='22' fill='%23fed7aa'/><path d='M38 46 Q60 20 82 46 Q80 28 60 26 Q40 28 38 46 Z' fill='%233b0764'/><path d='M38 46 Q35 68 44 76 Q42 56 46 48 Z' fill='%233b0764'/><path d='M82 46 Q85 68 76 76 Q78 56 74 48 Z' fill='%233b0764'/><circle cx='52' cy='48' r='2.5' fill='%231e1b4b'/><circle cx='68' cy='48' r='2.5' fill='%231e1b4b'/><path d='M55 58 Q60 62 65 58' stroke='%23e11d48' stroke-width='2' stroke-linecap='round' fill='none'/><path d='M26 112 Q60 84 94 112' fill='%23f43f5e'/><circle cx='60' cy='96' r='6' fill='%23fbbf24'/></svg>`;

const AVATAR_KAVYA = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='bgK' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2306b6d4'/><stop offset='100%' stop-color='%233b82f6'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23bgK)'/><circle cx='60' cy='46' r='22' fill='%23fed7aa'/><path d='M36 44 Q60 22 84 44 Q82 24 60 24 Q38 24 36 44 Z' fill='%231f2937'/><path d='M36 44 Q32 68 40 78 Q40 54 44 46 Z' fill='%231f2937'/><path d='M84 44 Q88 68 80 78 Q80 54 76 46 Z' fill='%231f2937'/><circle cx='52' cy='48' r='2.5' fill='%23111827'/><circle cx='68' cy='48' r='2.5' fill='%23111827'/><path d='M56 58 Q60 62 64 58' stroke='%23f43f5e' stroke-width='2' stroke-linecap='round' fill='none'/><path d='M26 112 Q60 84 94 112' fill='%230ea5e9'/><path d='M52 92 L68 92 L64 112 L56 112 Z' fill='%23ffffff'/></svg>`;

const AVATAR_SANTHOSH = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='bgS' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23f59e0b'/><stop offset='100%' stop-color='%23ea580c'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23bgS)'/><circle cx='60' cy='46' r='22' fill='%23fed7aa'/><path d='M38 38 Q60 20 82 38 Q78 24 60 24 Q42 24 38 38 Z' fill='%2318181b'/><rect x='44' y='42' width='14' height='10' rx='2' fill='none' stroke='%2309090b' stroke-width='2'/><rect x='62' y='42' width='14' height='10' rx='2' fill='none' stroke='%2309090b' stroke-width='2'/><line x1='58' y1='47' x2='62' y2='47' stroke='%2309090b' stroke-width='2'/><circle cx='51' cy='47' r='2' fill='%2309090b'/><circle cx='69' cy='47' r='2' fill='%2309090b'/><path d='M55 59 Q60 62 65 59' stroke='%23b45309' stroke-width='2' stroke-linecap='round' fill='none'/><path d='M26 112 Q60 84 94 112' fill='%23d97706'/></svg>`;

const AVATAR_KARTHIK = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='bgKarth' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2310b981'/><stop offset='100%' stop-color='%230d9488'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23bgKarth)'/><circle cx='60' cy='46' r='22' fill='%23fed7aa'/><path d='M38 36 Q60 18 82 36 Q75 22 60 22 Q45 22 38 36 Z' fill='%23292524'/><circle cx='52' cy='48' r='2.5' fill='%231c1917'/><circle cx='68' cy='48' r='2.5' fill='%231c1917'/><path d='M54 58 Q60 63 66 58' stroke='%23059669' stroke-width='2' stroke-linecap='round' fill='none'/><path d='M26 112 Q60 84 94 112' fill='%23059669'/><polygon points='60,86 52,112 68,112' fill='%23047857'/></svg>`;

const AVATAR_MUKESH = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='bgM' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23f43f5e'/><stop offset='100%' stop-color='%23e11d48'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23bgM)'/><circle cx='60' cy='46' r='22' fill='%23fed7aa'/><path d='M38 38 Q60 22 82 38 Q76 26 60 26 Q44 26 38 38 Z' fill='%23172554'/><circle cx='52' cy='48' r='2.5' fill='%231e3a8a'/><circle cx='68' cy='48' r='2.5' fill='%231e3a8a'/><path d='M56 60 Q60 58 64 60' stroke='%23991b1b' stroke-width='2' stroke-linecap='round' fill='none'/><path d='M26 112 Q60 84 94 112' fill='%23e11d48'/><circle cx='60' cy='94' r='4' fill='%23ffffff'/></svg>`;

const AVATAR_MENTOR = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='bgMentor' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%230f766e'/><stop offset='100%' stop-color='%231e293b'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23bgMentor)'/><circle cx='60' cy='44' r='22' fill='%23fcd34d'/><path d='M36 34 Q60 16 84 34 Q76 20 60 20 Q44 20 36 34 Z' fill='%23334155'/><rect x='44' y='40' width='13' height='9' rx='2' fill='none' stroke='%230f172a' stroke-width='2'/><rect x='63' y='40' width='13' height='9' rx='2' fill='none' stroke='%230f172a' stroke-width='2'/><line x1='57' y1='44' x2='63' y2='44' stroke='%230f172a' stroke-width='2'/><circle cx='50' cy='44' r='2' fill='%230f172a'/><circle cx='70' cy='44' r='2' fill='%230f172a'/><path d='M54 56 Q60 59 66 56' stroke='%23047857' stroke-width='2' stroke-linecap='round' fill='none'/><path d='M24 114 Q60 82 96 114' fill='%230f172a'/><polygon points='60,84 54,114 66,114' fill='%2314b8a6'/><polygon points='60,84 57,94 63,94' fill='%23f59e0b'/></svg>`;

// ─── 1. Mentor Profile ────────────────────────────────────────────────────────
export const MENTOR_PROFILE = {
  id: 'mentor-1',
  name: 'Dr. Arun Kumar',
  rollNumber: 'MTR-CSBS-01',
  designation: 'Associate Professor & Student Mentor',
  department: 'Computer Science & Business Systems',
  email: 'arun.kumar@campusinsight.edu',
  phone: '+91 98765 43210',
  office: 'Academic Block B, Room 304',
  assignedStudentsCount: 5,
  photo: AVATAR_MENTOR,
  avatar: AVATAR_MENTOR,
  bio: 'Specializing in Algorithmic Optimization, Data Structures, and Student Academic Development with 14+ years of university mentoring experience.',
};

// ─── 2. 5 Built-In Student Profiles (Single Source of Truth) ──────────────────
export const STUDENT_PROFILES = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Deepika — Roll No: CSBS001
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'student-demo-1',
    name: 'Deepika',
    rollNumber: 'CSBS001',
    department: 'Computer Science & Business Systems',
    year: 3,
    section: 'A',
    photo: AVATAR_DEEPIKA,
    avatar: AVATAR_DEEPIKA,
    email: 'deepika@campusinsight.edu',
    stats: {
      attendance: 92,
      assessmentScore: 88,
      internalMarks: 84,
      assignmentScore: 88,
      previousPerformance: 8.9,
      cgpa: 8.9,
      riskLevel: 'Low',
    },
    attendanceTrend: [
      { month: 'Jul', attendance: 94 },
      { month: 'Aug', attendance: 91 },
      { month: 'Sep', attendance: 93 },
      { month: 'Oct', attendance: 90 },
      { month: 'Nov', attendance: 92 },
      { month: 'Dec', attendance: 92 },
    ],
    assessmentTrend: [
      { month: 'Jul', assessment: 85 },
      { month: 'Aug', assessment: 87 },
      { month: 'Sep', assessment: 89 },
      { month: 'Oct', assessment: 88 },
      { month: 'Nov', assessment: 90 },
      { month: 'Dec', assessment: 88 },
    ],
    internalTrend: [
      { month: 'Jul', marks: 80 },
      { month: 'Aug', marks: 82 },
      { month: 'Sep', marks: 85 },
      { month: 'Oct', marks: 83 },
      { month: 'Nov', marks: 86 },
      { month: 'Dec', marks: 84 },
    ],
    subjectPerformance: [
      { subject: 'DSA',      internal_marks: 86, attendance: 93, assignment_score: 90 },
      { subject: 'OS',       internal_marks: 82, attendance: 91, assignment_score: 86 },
      { subject: 'DBMS',     internal_marks: 84, attendance: 92, assignment_score: 88 },
      { subject: 'Networks', internal_marks: 83, attendance: 90, assignment_score: 87 },
      { subject: 'Math',     internal_marks: 85, attendance: 94, assignment_score: 89 },
    ],
    insights: [
      'Consistent attendance exceeding the mandatory 75% threshold across all semesters.',
      'High coursework submission rate and strong performance in algorithmic concepts.',
      'Balanced internal exam scores with top decile performance in DSA and Math.',
    ],
    improvements: [
      'Maintain consistent revision pacing in Computer Networks prior to final evaluations.',
      'Explore advanced honors electives or competitive programming challenges.',
    ],
    summary: 'Deepika demonstrates exemplary academic engagement, low attrition risk, and steady performance across all coursework modules.',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Kavya — Roll No: CSBS002
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'student-demo-2',
    name: 'Kavya',
    rollNumber: 'CSBS002',
    department: 'Computer Science & Business Systems',
    year: 2,
    section: 'B',
    photo: AVATAR_KAVYA,
    avatar: AVATAR_KAVYA,
    email: 'kavya@campusinsight.edu',
    stats: {
      attendance: 76,
      assessmentScore: 68,
      internalMarks: 62,
      assignmentScore: 65,
      previousPerformance: 7.1,
      cgpa: 7.1,
      riskLevel: 'Moderate',
    },
    attendanceTrend: [
      { month: 'Jul', attendance: 78 },
      { month: 'Aug', attendance: 74 },
      { month: 'Sep', attendance: 77 },
      { month: 'Oct', attendance: 73 },
      { month: 'Nov', attendance: 79 },
      { month: 'Dec', attendance: 76 },
    ],
    assessmentTrend: [
      { month: 'Jul', assessment: 70 },
      { month: 'Aug', assessment: 66 },
      { month: 'Sep', assessment: 68 },
      { month: 'Oct', assessment: 65 },
      { month: 'Nov', assessment: 71 },
      { month: 'Dec', assessment: 68 },
    ],
    internalTrend: [
      { month: 'Jul', marks: 64 },
      { month: 'Aug', marks: 60 },
      { month: 'Sep', marks: 63 },
      { month: 'Oct', marks: 59 },
      { month: 'Nov', marks: 65 },
      { month: 'Dec', marks: 62 },
    ],
    subjectPerformance: [
      { subject: 'Web Tech',   internal_marks: 65, attendance: 77, assignment_score: 68 },
      { subject: 'Python',     internal_marks: 60, attendance: 74, assignment_score: 63 },
      { subject: 'DBMS',       internal_marks: 63, attendance: 78, assignment_score: 66 },
      { subject: 'Soft Skills',internal_marks: 68, attendance: 80, assignment_score: 70 },
      { subject: 'Math',       internal_marks: 58, attendance: 72, assignment_score: 60 },
    ],
    insights: [
      'Attendance hovers closely around the 75% cutoff threshold (76% average).',
      'Discrete Mathematics exhibits a performance dip with 58/100 internal score.',
      'Web Technologies and Soft Skills show promising practical engagement.',
    ],
    improvements: [
      'Attendance recovery plan required to build a safe buffer above the 75% threshold.',
      'Targeted tutoring in Discrete Mathematics before mid-term assessments.',
    ],
    summary: 'Kavya maintains acceptable progress but requires proactive monitoring in mathematics and attendance discipline to prevent escalating risk.',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Santhosh — Roll No: CSBS003
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'student-demo-3',
    name: 'Santhosh',
    rollNumber: 'CSBS003',
    department: 'Computer Science & Business Systems',
    year: 2,
    section: 'A',
    photo: AVATAR_SANTHOSH,
    avatar: AVATAR_SANTHOSH,
    email: 'santhosh@campusinsight.edu',
    stats: {
      attendance: 63,
      assessmentScore: 50,
      internalMarks: 48,
      assignmentScore: 52,
      previousPerformance: 6.3,
      cgpa: 6.3,
      riskLevel: 'High',
    },
    attendanceTrend: [
      { month: 'Jul', attendance: 68 },
      { month: 'Aug', attendance: 64 },
      { month: 'Sep', attendance: 60 },
      { month: 'Oct', attendance: 58 },
      { month: 'Nov', attendance: 65 },
      { month: 'Dec', attendance: 63 },
    ],
    assessmentTrend: [
      { month: 'Jul', assessment: 55 },
      { month: 'Aug', assessment: 52 },
      { month: 'Sep', assessment: 48 },
      { month: 'Oct', assessment: 46 },
      { month: 'Nov', assessment: 51 },
      { month: 'Dec', assessment: 50 },
    ],
    internalTrend: [
      { month: 'Jul', marks: 52 },
      { month: 'Aug', marks: 49 },
      { month: 'Sep', marks: 46 },
      { month: 'Oct', marks: 44 },
      { month: 'Nov', marks: 50 },
      { month: 'Dec', marks: 48 },
    ],
    subjectPerformance: [
      { subject: 'DSA',      internal_marks: 46, attendance: 62, assignment_score: 50 },
      { subject: 'OS',       internal_marks: 50, attendance: 65, assignment_score: 54 },
      { subject: 'DBMS',     internal_marks: 48, attendance: 63, assignment_score: 52 },
      { subject: 'Networks', internal_marks: 45, attendance: 60, assignment_score: 48 },
      { subject: 'Math',     internal_marks: 52, attendance: 66, assignment_score: 55 },
    ],
    insights: [
      'Attendance is currently 63%, falling 12% below the required regulatory cutoff.',
      'Internal scores in DSA (46) and Computer Networks (45) indicate foundational learning gaps.',
      'Correlation analysis suggests declining attendance directly mirrors lower assessment scores.',
    ],
    improvements: [
      'Immediate mandatory academic counseling and faculty intervention protocol.',
      'Structured remedial assignments to reinforce core data structures concepts.',
    ],
    summary: 'Santhosh is flagged in High Risk standing due to concurrent attendance shortage and sub-50 internal scores. Timely faculty intervention is recommended.',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Karthik — Roll No: CSBS004
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'student-demo-4',
    name: 'Karthik',
    rollNumber: 'CSBS004',
    department: 'Computer Science & Business Systems',
    year: 3,
    section: 'A',
    photo: AVATAR_KARTHIK,
    avatar: AVATAR_KARTHIK,
    email: 'karthik@campusinsight.edu',
    stats: {
      attendance: 85,
      assessmentScore: 76,
      internalMarks: 71,
      assignmentScore: 74,
      previousPerformance: 7.8,
      cgpa: 7.8,
      riskLevel: 'Low',
    },
    attendanceTrend: [
      { month: 'Jul', attendance: 87 },
      { month: 'Aug', attendance: 84 },
      { month: 'Sep', attendance: 86 },
      { month: 'Oct', attendance: 83 },
      { month: 'Nov', attendance: 86 },
      { month: 'Dec', attendance: 85 },
    ],
    assessmentTrend: [
      { month: 'Jul', assessment: 74 },
      { month: 'Aug', assessment: 76 },
      { month: 'Sep', assessment: 78 },
      { month: 'Oct', assessment: 75 },
      { month: 'Nov', assessment: 77 },
      { month: 'Dec', assessment: 76 },
    ],
    internalTrend: [
      { month: 'Jul', marks: 68 },
      { month: 'Aug', marks: 70 },
      { month: 'Sep', marks: 73 },
      { month: 'Oct', marks: 71 },
      { month: 'Nov', marks: 74 },
      { month: 'Dec', marks: 71 },
    ],
    subjectPerformance: [
      { subject: 'Cloud',      internal_marks: 74, attendance: 87, assignment_score: 78 },
      { subject: 'Python',     internal_marks: 70, attendance: 84, assignment_score: 73 },
      { subject: 'DBMS',       internal_marks: 72, attendance: 86, assignment_score: 75 },
      { subject: 'AI/ML',      internal_marks: 69, attendance: 83, assignment_score: 71 },
      { subject: 'Soft Skills',internal_marks: 73, attendance: 88, assignment_score: 76 },
    ],
    insights: [
      'Dependable attendance (85%) with positive trending across all five registered courses.',
      'Solid performance in Cloud Computing and Database Management Systems.',
      'Assessment submissions are consistently on schedule with 74% aggregate accuracy.',
    ],
    improvements: [
      'Encourage focus on Machine Learning mathematical foundations to lift scores above 75.',
      'Participate in technical seminar presentations.',
    ],
    summary: 'Karthik exhibits stable academic progression, satisfactory attendance adherence, and consistent coursework submissions.',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Mukesh — Roll No: CSBS005
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'student-demo-5',
    name: 'Mukesh',
    rollNumber: 'CSBS005',
    department: 'Computer Science & Business Systems',
    year: 1,
    section: 'B',
    photo: AVATAR_MUKESH,
    avatar: AVATAR_MUKESH,
    email: 'mukesh@campusinsight.edu',
    stats: {
      attendance: 51,
      assessmentScore: 35,
      internalMarks: 38,
      assignmentScore: 40,
      previousPerformance: 5.4,
      cgpa: 5.4,
      riskLevel: 'Critical',
    },
    attendanceTrend: [
      { month: 'Jul', attendance: 58 },
      { month: 'Aug', attendance: 54 },
      { month: 'Sep', attendance: 50 },
      { month: 'Oct', attendance: 46 },
      { month: 'Nov', attendance: 49 },
      { month: 'Dec', attendance: 51 },
    ],
    assessmentTrend: [
      { month: 'Jul', assessment: 40 },
      { month: 'Aug', assessment: 37 },
      { month: 'Sep', assessment: 33 },
      { month: 'Oct', assessment: 30 },
      { month: 'Nov', assessment: 34 },
      { month: 'Dec', assessment: 35 },
    ],
    internalTrend: [
      { month: 'Jul', marks: 43 },
      { month: 'Aug', marks: 40 },
      { month: 'Sep', marks: 36 },
      { month: 'Oct', marks: 33 },
      { month: 'Nov', marks: 37 },
      { month: 'Dec', marks: 38 },
    ],
    subjectPerformance: [
      { subject: 'DSA',    internal_marks: 35, attendance: 50, assignment_score: 38 },
      { subject: 'OS',     internal_marks: 40, attendance: 54, assignment_score: 42 },
      { subject: 'Physics',internal_marks: 42, attendance: 56, assignment_score: 44 },
      { subject: 'Math',   internal_marks: 33, attendance: 48, assignment_score: 36 },
      { subject: 'English',internal_marks: 44, attendance: 58, assignment_score: 47 },
    ],
    insights: [
      'Severe attendance deficiency (51%) triggers institutional critical risk alert.',
      'Assessment and internal marks are in the bottom quartile across all subjects.',
      'Disengagement trajectory requires urgent parental communication and mentor review.',
    ],
    improvements: [
      'Formal parental notification and intensive attendance recovery tracking.',
      'Peer mentoring assignment and foundational bridge courses in programming and mathematics.',
    ],
    summary: 'Mukesh requires intensive emergency intervention across attendance recovery, foundational coursework rebuilding, and structured counseling.',
  },
];

// ─── Derived cohort KPIs (calculated directly from the 5 profiles) ───────────
function avg(arr) {
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

const _atRisk = STUDENT_PROFILES.filter(
  (p) => p.stats.riskLevel === 'Critical' || p.stats.riskLevel === 'High'
);

export const COHORT_KPIS = {
  total_students: STUDENT_PROFILES.length,
  at_risk_students: _atRisk.length,
  risk_rate_percentage: Math.round((_atRisk.length / STUDENT_PROFILES.length) * 100),
  average_attendance: avg(STUDENT_PROFILES.map((p) => p.stats.attendance)),
  average_internal_marks: avg(STUDENT_PROFILES.map((p) => p.stats.internalMarks)),
  average_assignment_performance: avg(STUDENT_PROFILES.map((p) => p.stats.assignmentScore)),
};

// ─── Quick lookup map: id → profile ──────────────────────────────────────────
export const STUDENT_PROFILE_MAP = Object.fromEntries(
  STUDENT_PROFILES.map((p) => [p.id, p])
);

// ─── Roll Number Lookup Map: rollNumber → profile ────────────────────────────
export const STUDENT_ROLL_MAP = Object.fromEntries(
  STUDENT_PROFILES.map((p) => [p.rollNumber.toUpperCase(), p])
);

/**
 * Get student photo with localStorage custom photo override support
 */
export function getStudentPhoto(studentId) {
  if (typeof window !== 'undefined') {
    const customPhoto = localStorage.getItem(`learnGraph_photo_${studentId}`);
    if (customPhoto) return customPhoto;
  }
  const profile = STUDENT_PROFILE_MAP[studentId];
  return profile ? profile.photo : AVATAR_DEEPIKA;
}

/**
 * Update custom photo for a student in localStorage
 */
export function updateStudentPhoto(studentId, photoDataUrl) {
  if (typeof window !== 'undefined') {
    if (photoDataUrl) {
      localStorage.setItem(`learnGraph_photo_${studentId}`, photoDataUrl);
    } else {
      localStorage.removeItem(`learnGraph_photo_${studentId}`);
    }
    // Dispatch custom event to notify listeners across components
    window.dispatchEvent(new CustomEvent('student-photo-updated', { detail: { studentId, photo: photoDataUrl } }));
  }
}

/**
 * Reset student photo to default
 */
export function resetStudentPhoto(studentId) {
  updateStudentPhoto(studentId, null);
}

/**
 * Get a profile by student id, falling back to student-demo-1
 * Automatically merges any custom uploaded photo from localStorage.
 */
export function getStudentProfile(studentId) {
  const baseProfile = STUDENT_PROFILE_MAP[studentId] ?? STUDENT_PROFILES[0];
  const customPhoto = getStudentPhoto(baseProfile.id);
  return {
    ...baseProfile,
    photo: customPhoto,
    avatar: customPhoto,
  };
}

/**
 * Search student by Roll Number (Case-insensitive, exact or trimmed match)
 */
export function getStudentByRollNumber(rollNumber) {
  if (!rollNumber) return null;
  const clean = rollNumber.trim().toUpperCase();
  return STUDENT_ROLL_MAP[clean] ?? STUDENT_PROFILES.find(
    (p) => p.rollNumber.toUpperCase() === clean || p.id.toUpperCase() === clean
  ) ?? null;
}

// ─── Mentor Feedback Storage & Retrieval Helpers ─────────────────────────────
const DEFAULT_FEEDBACK_DATA = {
  'student-demo-1': [
    {
      id: 'fb-1-1',
      date: '2026-10-06T10:15:00.000Z',
      mentorName: 'Dr. Arun Kumar',
      text: 'Exceptional academic consistency in Data Structures and Discrete Math. Recommended to participate in regional collegiate hackathons.',
    },
  ],
  'student-demo-2': [
    {
      id: 'fb-2-1',
      date: '2026-10-07T14:30:00.000Z',
      mentorName: 'Dr. Arun Kumar',
      text: 'Improve attendance in DBMS and practice internal assessment questions regularly.',
    },
  ],
  'student-demo-3': [
    {
      id: 'fb-3-1',
      date: '2026-10-07T16:00:00.000Z',
      mentorName: 'Dr. Arun Kumar',
      text: 'Attendance is currently below the mandatory 75% limit. Meet me during office hours for a structured academic recovery schedule.',
    },
  ],
  'student-demo-4': [
    {
      id: 'fb-4-1',
      date: '2026-10-05T11:45:00.000Z',
      mentorName: 'Dr. Arun Kumar',
      text: 'Solid progress in Cloud Computing and DBMS coursework. Continue revising AI/ML math concepts.',
    },
  ],
  'student-demo-5': [
    {
      id: 'fb-5-1',
      date: '2026-10-08T09:00:00.000Z',
      mentorName: 'Dr. Arun Kumar',
      text: 'Urgent intervention required. Attendance is critical (51%). Mandatory parent-mentor meeting scheduled this Friday.',
    },
  ],
};

/**
 * Retrieve all feedback for a student
 */
export function getStudentFeedback(studentId) {
  if (typeof window === 'undefined') {
    return DEFAULT_FEEDBACK_DATA[studentId] || [];
  }
  const stored = localStorage.getItem('learnGraph_mentor_feedbacks');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed[studentId]) return parsed[studentId];
    } catch {
      // Fallback
    }
  }
  return DEFAULT_FEEDBACK_DATA[studentId] || [];
}

/**
 * Save new mentor feedback for a student
 */
export function saveStudentFeedback(studentId, feedbackText, mentorName = 'Dr. Arun Kumar') {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('learnGraph_mentor_feedbacks');
  let data = {};
  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch {
      data = {};
    }
  } else {
    data = { ...DEFAULT_FEEDBACK_DATA };
  }

  const studentList = data[studentId] ? [...data[studentId]] : (DEFAULT_FEEDBACK_DATA[studentId] ? [...DEFAULT_FEEDBACK_DATA[studentId]] : []);
  const newEntry = {
    id: `fb-${studentId}-${Date.now()}`,
    date: new Date().toISOString(),
    mentorName,
    text: feedbackText.trim(),
  };

  studentList.unshift(newEntry);
  data[studentId] = studentList;
  localStorage.setItem('learnGraph_mentor_feedbacks', JSON.stringify(data));

  // Dispatch custom event to notify student profile / mentor views
  window.dispatchEvent(new CustomEvent('student-feedback-updated', { detail: { studentId, feedback: newEntry } }));
  return studentList;
}
