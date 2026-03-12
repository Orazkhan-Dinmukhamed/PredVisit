# PredVisit — Hospital Management Platform

[![Deploy](https://img.shields.io/badge/deployed-Vercel-black?logo=vercel)](https://vercel.com)
[![Database](https://img.shields.io/badge/database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![AI](https://img.shields.io/badge/AI-Groq%20%2F%20Qwen-7C3AED)](https://groq.com)
[![Voice](https://img.shields.io/badge/voice-RU%20%7C%20KZ%20%7C%20EN-7C3AED)]()
[![Status](https://img.shields.io/badge/status-MVP-7C3AED)]()

> AI-powered platform for hospital staff — patient records, predictive analytics, real-time chat, and dual-mode clinical AI assistant.

---

## 🎬 Demo

[![Watch Demo](https://img.youtube.com/vi/rs8q5fPpKR0/maxresdefault.jpg)](https://youtu.be/rs8q5fPpKR0)

> Click the thumbnail to watch the full demo with walkthrough.

---

## Screenshots

<img src="https://raw.githubusercontent.com/Orazkhan-Dinmukhamed/PredVisit/main/image1.png" width="100%" />

<img src="https://raw.githubusercontent.com/Orazkhan-Dinmukhamed/PredVisit/main/image2.png" width="100%" />

---

## Features

- **Patient & Staff database** — add, edit, delete, filter by any parameter
- **Upcoming surgeries** — scheduled operations with real-time day tracking
- **Statistics dashboard** — diagnoses breakdown, avg. hospitalization duration, readmission rates
- **Dual-mode AI assistant**
  - *Database mode* — reads live records, answers about patients, surgeries, ICD codes, hospitalization days
  - *Advisory mode* — clinical guidance, care protocols, nursing procedures
- **Readmission prediction** — AI scores each patient's readmission probability based on age, diagnosis, comorbidities
- **Persistent chat history** — saved per user, deleted only on demand
- **Draft mode** — private unsaved AI session, no data stored
- **Real-time staff chat** — with speech-to-text and push notifications
- **Multilingual voice input** — Russian, Kazakh, English
- **AI response time** — under 1 second on average

---

<img src="https://raw.githubusercontent.com/Orazkhan-Dinmukhamed/PredVisit/main/image3.png" width="100%" />

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS, HTML, CSS |
| Backend / API | Node.js (route handlers in `/api`) |
| Database | Supabase (PostgreSQL) |
| AI / LLM | Groq API (Qwen model) |
| Voice | Whisper via `/api/whisper.js` |
| Real-time chat | Supabase Realtime |
| Deploy | Vercel |

---

## Project Structure

```
/
├── api/
│   ├── chat.js          # Single AI chat session
│   ├── chats.js         # Chat history management
│   ├── groupchat.js     # Real-time group chat between staff
│   ├── notes.js         # Patient notes
│   ├── operations.js    # Surgery records
│   ├── patients.js      # Patient CRUD
│   ├── staff.js         # Staff CRUD
│   ├── stats.js         # Statistics & analytics
│   └── whisper.js       # Voice-to-text (multilingual)
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── config.js    # ← Set your Supabase keys here
│   │   ├── lang.js      # i18n (RU / KZ / EN)
│   │   └── notify.js
│   ├── index.html
│   ├── login.html
│   ├── operations.html
│   ├── staff.html
│   └── groupchat.html
├── SUPABASE.sql         # Main schema — run this first
├── SUPABASE2.sql        # Additional tables / migrations
├── vercel.json
└── package.json
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/Orazkhan-Dinmukhamed/PredVisit.git
cd PredVisit
npm install
```

### 2. Supabase

Go to [supabase.com](https://supabase.com), create a project, then run both SQL files in the **SQL Editor** in order:

1. `SUPABASE.sql` — creates the main schema (patients, staff, operations, chats, etc.)
2. `SUPABASE2.sql` — runs additional tables and migrations

Copy your project URL and anon key from **Project Settings → API**.

Update `public/js/config.js` and every file inside `/api/` that contains placeholders like:

```javascript
const SUPABASE_URL = 'PLEASE_SET_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'PLEASE_SET_SUPABASE_ANON_KEY';
```

### 3. Groq API key

```bash
vercel env add QWEN_API_KEY
# Paste your Groq API key when prompted
```

Used in `/api/chat.js` and `/api/whisper.js`.

### 4. Deploy

```bash
vercel --prod
```

Or connect the repo to Vercel dashboard — it picks up `vercel.json` automatically.

---

<img src="https://raw.githubusercontent.com/Orazkhan-Dinmukhamed/PredVisit/main/4.png" width="100%" />

---

## AI Disclaimer

Every AI response includes an inline disclaimer that the output may contain errors and is not a substitute for professional medical judgment. A persistent disclaimer is also shown in the site footer.

---

## Author

**Orazkhan Dinmukhamed**

---

## License

MIT
