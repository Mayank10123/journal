# ArvyaX Journal – Architecture & Engineering Decisions

## System Overview

The current system is a monolithic Express.js REST API backed by SQLite, with a React SPA frontend. The LLM analysis is performed synchronously by Groq's hosted inference API (Llama 3.3 70B Versatile), and analysis results are cached in-process using an LRU Map.

```
[React SPA] ──── HTTP ────► [Express API] ──── SQL ────► [SQLite DB]
                                    │
                                    └── HTTPS ──► [Groq Inference API]
```

---

## 1. How Would You Scale This to 100k Users?

The current single-process architecture would become a bottleneck at ~500 concurrent users. Here is the upgrade path:

### Database
- **Migrate SQLite → PostgreSQL**: SQLite is single-writer by design. PostgreSQL handles thousands of concurrent writes and reads, supports connection pooling, and has excellent JSON support for the `keywords` column.
- **Read Replicas**: Route all `GET` requests (journal list, insights) to read replicas to reduce load on the primary write node.
- **Indexing**: Add a composite index on `(userId, createdAt DESC)` so timeline queries remain O(log n).

### Application Server
- **Horizontal Scaling**: Run multiple stateless Express instances behind an **NGINX** or **AWS ALB** load balancer. Express is stateless by design (the in-memory cache is the only exception — see Section 3 for how to move it out).
- **Containerisation**: Package the backend in Docker so replicas can be spun up/down in seconds on Kubernetes or ECS based on CPU/request metrics.

### LLM Analysis
- **Async Queue Architecture**: At scale, forcing a user to wait synchronously for LLM inference (~1-3s) in an HTTP request is unacceptable. Decouple it:
  1. `POST /api/journal/analyze` enqueues a job into **Redis BullMQ** and returns `{ jobId }` immediately.
  2. A pool of worker processes drain the queue and write the result to a `analysis_jobs` table.
  3. The frontend polls `GET /api/journal/analysis/:jobId` or receives the result via a WebSocket push.

### CDN & Static Assets
- Serve the React SPA from **Cloudflare CDN** so that all static JS/CSS is edge-cached globally, reducing origin traffic to zero for frontend assets.

---

## 2. How Would You Reduce LLM Cost?

Groq is already cost-efficient (Llama 3.3 70B is one of the cheapest capable models), but at 100k users these savings multiply:

### Model Tiering
- **Default**: Route to a small, fast model like `llama-3.1-8b-instant` for short journal entries (< 200 words). This is ~10× cheaper and still accurate for basic emotion classification.
- **Upgrade**: Only route to `llama-3.3-70b-versatile` for long, complex entries where nuance matters.

### Aggressive Caching (see Section 3)
- Every cache hit is a free call. At scale, many users will submit similar short entries ("I felt relaxed", "I felt calm"). Semantic deduplication eliminates a huge fraction of calls.

### Prompt Optimisation
- The current prompt is already lean (system prompt + user text). Avoid few-shot examples in the system prompt as they add tokens on every call.
- Use `max_tokens: 200` to hard-cap the output size and prevent runaway responses.

### Batching (Offline Mode)
- Offer an "analyse later" option. Batch unanalysed entries in off-peak hours using a cron job. Many users don't need real-time analysis.

---

## 3. How Would You Cache Repeated Analysis?

### Current Implementation (In-Memory LRU)
The backend maintains a JavaScript `Map` with a CACHE_LIMIT of 1000 entries. On each `/analyze` call:
1. It checks if the exact input `text` exists in the Map.
2. If found, it deletes and re-inserts the entry (LRU promotion) and returns it instantly.
3. If not found, it calls Groq, stores the result, and evicts the oldest entry if the map is full.

**Limitation**: This cache is per-process and is lost on restart.

### Production Upgrade Path

**Layer 1 – Exact Match Cache (Redis)**
- Move the LRU map to **Redis** with a TTL of 7 days. All horizontally-scaled backend replicas share the same cache. A cache hit costs ~0.5ms vs. ~1500ms for a Groq call.

```
POST /analyze → hash(text) → Redis GET →
  HIT  → return cached JSON
  MISS → Groq API → Redis SET (TTL 7d) → return
```

**Layer 2 – Semantic Similarity Cache**
- On a cache miss, before going to the LLM, generate a vector embedding of the input text using a fast local model (e.g., `nomic-embed-text`).
- Query **pgvector** (or Pinecone) for any stored embedding with cosine similarity > 0.95.
- If found, reuse the stored analysis with a note that it was a semantic match.
- This catches paraphrases and near-duplicate entries that exact-match won't.

**Layer 3 – Persistent DB Cache**
- Store the `(text_hash, analysis_json)` in a `analysis_cache` PostgreSQL table so even a Redis flush doesn't force a re-analysis of previously seen entries.

---

## 4. How Would You Protect Sensitive Journal Data?

Journal entries contain deeply personal mental health information. Protection operates at multiple levels:

### Encryption at Rest
- **Database-level encryption**: Enable PostgreSQL's `pgcrypto` extension to encrypt the `text` and `summary` columns using AES-256. Even if someone obtains a raw database dump, they cannot read user entries without the application key.
- **Key Management**: Store encryption keys in **AWS KMS** or **HashiCorp Vault**, not in the application `.env`.

### PII Scrubbing Before LLM
- Journal text is sent to a third-party inference API (Groq). Before any text leaves our servers, run it through a PII scrubbing library (e.g., **Microsoft Presidio** or a simple regex pipeline) to strip explicit identifiers: full names, phone numbers, email addresses, and GPS coordinates.
- Log what was stripped for audit purposes. The LLM only ever sees anonymised text.

### Authentication & Authorisation
- Replace the current `userId` string with a **JWT-based auth** layer (Auth0 or Supabase Auth).
- Every API route verifies that the JWT's `sub` claim matches the `:userId` parameter. A user can never read another user's entries.
- Rate-limit `/api/journal/analyze` to 20 requests/minute per user to prevent data extraction via the API.

### Transport Security
- Terminate HTTPS at the load balancer with TLS 1.3. All connections between services (backend ↔ database) use TLS as well.
- Set strict `CORS` origin headers so only the registered frontend domain can make cross-origin requests.

### Compliance
- At 100k users, the product collects mental health data which may fall under **GDPR** (EU) or **HIPAA** (US healthcare context). Implement:
  - Right-to-erasure: `DELETE /api/user/:userId` that hard-deletes all rows.
  - Data residency controls: keep EU user data in EU-region infrastructure.
