# 🎓 CampusInsight AI
### *"From Student Data to Smarter Intervention."*

> **Unified Student Academic Analytics, Predictive Early-Warning, and Hands-Free Voice Assistant Platform**

[![GitHub Repository](https://img.shields.io/badge/GitHub-campusinsight.ai-181717?logo=github)](https://github.com/Karthick71438/campusinsight.ai)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3+-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/pytest-26%20passed-success?logo=pytest)](backend/tests)

---

## 🎯 Overview

Traditional Learning Management Systems record passive metrics like lesson completion, but fail to connect holistic student signals (attendance fluctuations, internal marks, assignment scores, and cognitive retention decay) before a student falls at risk.

**CampusInsight AI** bridges this gap by unifying student performance analytics, an Ebbinghaus knowledge decay tracker, syllabus-driven adaptive learning paths, faculty early-warning interventions, and an interactive **Jarvis AI Voice Assistant** into a single cohesive platform.

---

## ✨ Key Platform Features

### 🎙️ 1. Jarvis AI Voice Assistant & Animated Robot Avatar
- **Hands-Free Wake Phrase Detection**: Activates in real time upon hearing *"Hey Jarvis"* or *"Hey Chat"* with sub-200ms interim stream detection.
- **Cinematic Voice Overlay**: Responsive interface featuring a technical animated robot avatar, glowing audio equalizer orb, and real-time speech transcript bubble.
- **Natural Spoken Navigation**: Voice commands navigate seamlessly to Dashboard, Quiz, Profile, Knowledge Graph, Decay Tracker, Roadmap, Faculty View, and Brain Blast.
- **Student Data Intelligence**: Queries actual student records to answer questions like:
  - *"What is my attendance percentage?"* (provides percentage, monthly trend, and shortage risk warnings)
  - *"What is my assessment score and CGPA?"*
  - *"Which subject am I weakest in?"* (identifies lowest scoring subject and explains causes)
  - *"Give me study recommendations."*
- **AI Fallback**: General conceptual queries resolve via Google Gemini with markdown-to-speech filtering.
- **Privacy & Background Guard**: Hardware-echo cancellation and session gating prevent ambient room conversation from interrupting navigation.

### 🧪 2. Quiz-Centric Syllabus & Topic Hierarchy
- **Single Source of Truth**: Upload syllabus PDF materials directly in the Quiz module to extract concepts, generate quizzes, and establish the course hierarchy.
- **Cross-Module Synchronization**: Quiz results automatically calibrate student mastery across the Knowledge Graph, Decay Tracker, and Adaptive Roadmap without redundant uploads.
- **Retake vs. Practice Another Set**: Flexible assessment options allowing students to reinforce previously missed questions or generate a fresh set.

### 📉 3. Knowledge Decay Tracker (DK Analyzer)
- **Ebbinghaus Forgetting Curve**: Models retention over time:
  $$\text{Retention}(t) = \max\left(\text{floor}, \text{initial\_score} \times e^{-t / \text{stability}}\right)$$
- **Retention Tiers**: Categorizes concepts into *Strong (≥85%)*, *Stable (70–84%)*, *Weakening (50–69%)*, and *At Risk (<50%)*.
- **Reverse-Path Root Cause Analyzer**: Traces failing concepts backward through prerequisite dependencies to pinpoint the foundational gap.

### 🗺️ 4. Adaptive Learning Roadmap
- **Dynamic Learning Paths**: Automatically builds personalized step-by-step roadmaps from the student's active syllabus and quiz retention scores.
- **Prerequisite Locking**: Concepts unlock as foundational prerequisites reach verified mastery.

### 👨‍🏫 5. Faculty & Mentor Dashboard
- **Cohort Monitoring**: Faculty view tracking student risk status across 4 tiers (*Low*, *Moderate*, *High*, *Critical*).
- **Early Warning Indicators**: Flags students experiencing attendance dips below the 75% regulatory cutoff or declining internal trends.
- **Automated Interventions**: Suggests remedial assignments, peer tutoring, or mandatory counseling before formal evaluations.

### 🧠 6. Brain Blast Cognitive Suite
Six interactive cognitive exercises designed to strengthen mental agility:
1. 🃏 **Memory Match** — Flip and match concept pairs from memory.
2. 🔢 **Quick Pattern** — Identify the next logical element in algorithmic sequences.
3. ⚡ **Speed Sort** — Rapid-fire classification against dynamic criteria.
4. 🔍 **Odd One Out** — Isolate outlier concepts from structured clusters.
5. 🔄 **Memory Sequence** — Reproduce expanding procedural sequences.
6. 🎯 **Reaction Blast** — High-speed reflex challenges testing concept recognition.

### 💬 7. DOUBT AI Chatbot
- Context-aware tutor powered by Google Gemini to clarify conceptual doubts, review past quiz questions, and generate hints.

### 📄 8. Progress Reports & Privacy
- One-click PDF learning report generation.
- Full privacy controls with one-click data deletion (Right to Erasure).

---

## 🏗️ Architecture

```
campusinsight.ai/
├── backend/                              # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                       # App entry point, middleware & CORS
│   │   ├── config.py                     # Environment & application settings
│   │   ├── database.py                   # SQLAlchemy SQLite/PostgreSQL engine
│   │   ├── models/                       # Database ORM entities
│   │   ├── schemas/                      # Pydantic request/response schemas
│   │   ├── routes/
│   │   │   ├── auth.py                   # JWT Authentication
│   │   │   ├── google_auth.py            # Google OAuth 2.0 PKCE flow
│   │   │   ├── quiz.py                   # Adaptive quiz engine & PDF upload
│   │   │   ├── syllabus.py               # Syllabus management & roadmap
│   │   │   ├── graph.py                  # Knowledge graph endpoints
│   │   │   ├── analytics.py              # Decay & mastery analytics
│   │   │   ├── campus_analytics.py       # Faculty KPI & cohort endpoints
│   │   │   ├── chat.py                   # Gemini AI tutor
│   │   │   └── demo.py                   # Demo state controller
│   │   ├── analytics_engine/             # Predictive early-warning engine
│   │   │   ├── early_warning.py          # Risk score calculation
│   │   │   ├── intervention_engine.py    # Recommended actions
│   │   │   └── insight_engine.py         # Cohort trend insights
│   │   └── services/
│   │       ├── decay.py                  # Ebbinghaus decay model
│   │       ├── mastery.py                # Mastery computation
│   │       ├── question_generator.py     # AI question generation
│   │       └── syllabus_parser.py        # PDF extraction & topic hierarchy
│   ├── data/                             # Seed datasets (concepts, students)
│   ├── tests/                            # Pytest test suite (26 passing tests)
│   └── requirements.txt
│
└── frontend/                             # React + Vite Single Page App
    ├── public/
    │   └── jarvis/                       # Voice assistant assets & robot avatars
    ├── src/
    │   ├── pages/
    │   │   ├── DashboardPage.jsx         # Student KPIs & overview
    │   │   ├── QuizPage.jsx              # Syllabus upload & smart quiz
    │   │   ├── GraphPage.jsx             # Interactive concept graph
    │   │   ├── DecayPage.jsx             # Knowledge decay tracker (DK Analyzer)
    │   │   ├── RoadmapPage.jsx           # Adaptive learning roadmap
    │   │   ├── FacultyDashboardPage.jsx  # Faculty cohort & early warning view
    │   │   ├── MentorDashboardPage.jsx   # Mentor tracking interface
    │   │   ├── StudentProfilePage.jsx    # Student profile & semester trends
    │   │   ├── BrainBlastPage.jsx        # 6 cognitive mini-games
    │   │   └── HelpSupportPage.jsx       # FAQ & support documentation
    │   ├── components/
    │   │   ├── jarvis/                   # Jarvis Voice Assistant subsystem
    │   │   │   ├── JarvisAssistant.jsx   # Voice engine coordinator
    │   │   │   ├── JarvisVoiceService.js # Web Speech engine & intent resolver
    │   │   │   ├── JarvisOverlay.jsx     # Cinematic full-screen UI
    │   │   │   ├── JarvisRobotAvatar.jsx # Animated robot character
    │   │   │   ├── JarvisOrb.jsx         # Concentric audio equalizer orb
    │   │   │   └── JarvisFloatingButton.jsx # Bottom-left trigger & status badge
    │   │   ├── brain-blast/              # Mini-game implementations
    │   │   ├── KnowledgeGraph.jsx        # D3 / Canvas concept visualizer
    │   │   ├── DecayChart.jsx            # Ebbinghaus retention curves
    │   │   ├── DoubtChatbot.jsx          # AI floating chat tutor
    │   │   └── Navbar.jsx                # Responsive navigation bar
    │   ├── data/
    │   │   ├── studentProfiles.js        # Student & mentor records
    │   │   └── dkTopicsStore.js          # Shared topic & decay store
    │   └── services/api.js               # Centralized Axios API client
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, TailwindCSS 3, Recharts, Lucide Icons |
| **Voice & Audio** | Web Speech API (`SpeechRecognition` & `SpeechSynthesisUtterance`), Web Audio API (`AudioContext`) |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| **AI & Analytics** | Google Gemini API (question generation & tutor chat), NetworkX, NumPy |
| **Authentication** | JWT (JSON Web Tokens), Google OAuth 2.0 with PKCE |
| **Document Processing** | PyPDF2, pdfplumber, ReportLab |
| **Testing** | Pytest (26 integration and endpoint test suites) |

---

## 🚀 Getting Started

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com)

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env    # On Linux/macOS: cp .env.example .env
```

Edit `.env` to include your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_jwt_secret_key_here
```

Start the FastAPI backend:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **API Server**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
- **Frontend Web Application**: `http://localhost:3004` (or configured dev port)

---

### 3. Running Backend Tests

```bash
# From the project root
python -m pytest backend/tests/ -v
```
All **26 test suites** validate authentication, early warning analytics, quiz submission, decay algorithms, and API endpoints.

---

## 🔐 Configuration & Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for question generation & AI chat | *Required* |
| `SECRET_KEY` | Secret key for signing JWT tokens | `campusinsight-secret-key` |
| `DATABASE_URL` | SQLite / PostgreSQL connection URI | `sqlite:///./learngraph.db` |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth Client ID | — |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth Client Secret | — |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
