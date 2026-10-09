TEAM NAME:INOVEX  
TRACK:EduGen-AI  
DOMAIN:Intelligent Education System  
GITHUB LINK: https://github.com/Karthick71438/learn-graph-ai.git  

PROBLEM STATEMENT: Traditional campus systems fail to connect holistic student signals (attendance, internal tests, assignments) with timely, actionable faculty interventions before students fail.
PROPOSED SOLUTION: CampusInsight AI (Platform)
  
TEAM LEADER:DEEBIKA S  
TEAM LEADER EMAIL:deebikasubramaniatr1209@gmail.com  
TEAM LEADER CONTACT:9500788893  

MEMBER 1 NAME:KARTHICK M  
MEMBER 1 EMAIL:25cb015@kpriet.ac.in  
MEMBER 1 CONTACT:8903912721  

MEMBER 2 NAME:REKHA T  
MEMBER 2 EMAIL:25cb041@kpriet.ac.in  
MEMBER 2 CONTACT:9488869766  

MEMBER 3 NAME:NEETHA U  
MEMBER 3 EMAIL:25cb032@kpriet.ac.in  
MEMBER 3 CONTACT:7695978514  


# 🎓 CampusInsight AI
### *"From Student Data to Smarter Intervention."*

> **Unified Student Performance Analytics & Faculty Intervention Platform**

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF?logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3+-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

---

## 🎯 Problem Statement

Traditional learning management systems track *what students studied* — not *what they actually remember*. Students forget concepts over time (Ebbinghaus Forgetting Curve), yet most platforms show only completion percentages.

**LearnGraph AI** solves this by modeling knowledge as a **living graph** that decays over time, identifies prerequisite bottlenecks, and drives personalised revision recommendations with full explainability.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔗 **Knowledge Graph** | Visual graph of concepts, prerequisites, and mastery levels |
| 📉 **Knowledge Decay Engine** | Ebbinghaus-based retention decay tracking per concept |
| 🗺️ **Adaptive Roadmap** | Syllabus-driven personalised learning path |
| 🧪 **Smart Quiz System** | Adaptive MCQ quizzes with Retake vs Practice Another Set |
| 🏆 **Revision Queue** | Priority-ranked revision list based on decay urgency |
| 🧬 **Curriculum Dependency Graph** | Interactive prerequisite chain with color-coded strength |
| 🧠 **Brain Blast** | 6 cognitive mini-games to keep students mentally sharp |
| 🤖 **DOUBT AI Chatbot** | Context-aware AI learning assistant |
| 📊 **Progress Reports** | Downloadable PDF learning progress reports |
| 🔐 **Google OAuth** | Secure Google Sign-In with backend token exchange |
| 🌓 **Dark / Light Mode** | Full theme toggle for comfortable studying |
| 🔒 **Student Privacy** | One-click data deletion (right to erasure) |

---

## 🏗️ Architecture

```
learn-graph-ai/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # App entry point + CORS
│   │   ├── config.py           # Settings & environment config
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── routes/             # API route handlers
│   │   │   ├── auth.py         # Email/password auth
│   │   │   ├── google_auth.py  # Google OAuth 2.0
│   │   │   ├── quiz.py         # Adaptive quiz engine
│   │   │   ├── syllabus.py     # Syllabus upload & parsing
│   │   │   ├── graph.py        # Knowledge graph endpoints
│   │   │   ├── analytics.py    # Decay & mastery analytics
│   │   │   └── recommendations.py
│   │   └── services/
│   │       ├── decay.py        # Ebbinghaus decay model
│   │       ├── mastery.py      # Mastery scoring
│   │       ├── question_generator.py  # AI question generation
│   │       ├── syllabus_parser.py     # PDF/text syllabus parsing
│   │       └── pdf_report_generator.py
│   ├── data/                   # Seed data (concepts, questions)
│   ├── tests/                  # Pytest test suite (20 tests)
│   └── requirements.txt
│
└── frontend/                   # React + Vite frontend
    └── src/
        ├── pages/
        │   ├── DashboardPage.jsx
        │   ├── DecayPage.jsx       # Knowledge Decay Graph
        │   ├── GraphPage.jsx       # Knowledge Graph (interactive)
        │   ├── RoadmapPage.jsx     # Adaptive Learning Roadmap
        │   ├── QuizPage.jsx        # Quiz & Assessment
        │   ├── RevisionPage.jsx    # Revision Queue
        │   ├── BrainBlastPage.jsx  # Cognitive mini-games
        │   └── HelpSupportPage.jsx
        ├── components/
        │   ├── AuthModal.jsx
        │   ├── GoogleAuthCallback.jsx
        │   ├── DoubtChatbot.jsx
        │   ├── DecayChart.jsx
        │   └── brain-blast/        # 6 cognitive games
        └── services/api.js
```

---

## 🧠 Knowledge Decay Model

Uses the **Ebbinghaus Forgetting Curve** to model retention:

```
Retention(t) = max(floor, initial_score × e^(-t / stability))
```

- **Stability factor** calibrated to real learning patterns
- **Decay status**: Strong (≥85%) → Stable (70–84%) → Weakening (50–69%) → At Risk (<50%)
- **Auto-triggered** after every quiz attempt
- **Syllabus-driven** — only shows topics from the student's actual syllabus

---

## 🎮 Brain Blast Games

6 cognitive mini-games designed to keep students mentally active:

1. 🃏 **Memory Match** — Flip card pairs from memory
2. 🔢 **Quick Pattern** — Identify what comes next in a sequence
3. ⚡ **Speed Sort** — Classify items rapidly against a rule
4. 🔍 **Odd One Out** — Find the item that doesn't belong
5. 🔄 **Memory Sequence** — Reproduce an increasing sequence
6. ⚡ **Reaction Blast** — React only to the correct target

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Copy and configure environment
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY

uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3003
```

### Access
- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

---

## 🔐 Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Set:
   - **Authorized JavaScript origins**: `http://localhost:3003`
   - **Authorized redirect URIs**: `http://localhost:8000/api/auth/google/callback`
4. Add to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
5. Add to `frontend/.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id
   ```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
# 20 tests — all passing
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, TailwindCSS 3, Recharts, Lucide Icons |
| **Backend** | FastAPI, SQLAlchemy, SQLite (dev) / PostgreSQL (prod) |
| **AI / LLM** | Google Gemini API (question generation, chat) |
| **Knowledge Graph** | NetworkX (embedded) / Neo4j AuraDB (optional) |
| **Auth** | JWT + Google OAuth 2.0 (PKCE backend flow) |
| **PDF Reports** | ReportLab |

---

## 📸 Screenshots

| Dashboard | Knowledge Graph | Decay Analysis |
|-----------|----------------|----------------|
| Real-time mastery overview | Interactive prerequisite graph | Topic-level decay curves |

---

## 👥 Team

Built with ❤️ for the Hackathon.

---

## 📄 License

This project is submitted as a hackathon entry. All rights reserved.
