# ArvyaX AI-Assisted Journal System

A full-stack application for journaling after immersive nature sessions. Users log their experience, get AI-powered emotion analysis via Groq (Llama 3.3), and view mental state insights over time.

---

## Prerequisites

- **Node.js** v18+
- **A Groq API Key** – Get one free at [console.groq.com](https://console.groq.com)

---

## Project Structure

```
arya/
├── backend/         # Node.js + Express API
│   ├── server.js    # All API routes
│   ├── db.js        # SQLite setup & schema
│   ├── .env         # Environment variables
│   └── package.json
├── frontend/        # React (Vite) SPA
│   ├── src/
│   │   ├── App.jsx  # Main UI
│   │   └── index.css
│   └── package.json
├── README.md
└── ARCHITECTURE.md
```

---

## Setup & Running Locally

### 1. Backend

```bash
cd backend
npm install
```

Edit `.env` and insert your Groq API key:

```env
PORT=3001
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

Start the server:

```bash
node server.js
```

The backend starts on **http://localhost:3001** and auto-creates `database.sqlite`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The React app starts on **http://localhost:5173**.

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/journal` | Create a new journal entry |
| `GET` | `/api/journal/:userId` | Get all entries for a user |
| `POST` | `/api/journal/analyze` | Analyze text with Groq LLM |
| `GET` | `/api/journal/insights/:userId` | Get aggregated user insights |

### POST `/api/journal`
```json
{
  "userId": "123",
  "ambience": "forest",
  "text": "I felt calm after listening to the rain."
}
```

### POST `/api/journal/analyze`
```json
{ "text": "I felt calm after listening to the rain." }
```
**Response:**
```json
{
  "emotion": "calm",
  "keywords": ["rain", "nature", "peace"],
  "summary": "User experienced deep relaxation during a forest session."
}
```

### GET `/api/journal/insights/:userId`
**Response:**
```json
{
  "totalEntries": 8,
  "topEmotion": "calm",
  "mostUsedAmbience": "forest",
  "recentKeywords": ["focus", "nature", "rain"]
}
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express |
| Database | SQLite (via `sqlite3`) |
| LLM | Groq API – Llama 3.3 70B |
| Frontend | React (Vite), Tailwind CSS v4 |
| Icons | Lucide React |
