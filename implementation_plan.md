# CTO Takeover Document: AI-Powered Academic Knowledge Assistant

## User Review Required
> [!IMPORTANT]
> This is the revised strategic roadmap tailored specifically for a 3rd-year CS student targeting top-tier AI/ML and SWE internships. It pivots the project from a basic document manager into a Perplexity/NotebookLM clone using Groq, Hugging Face, and Supabase. Review this plan and approve it so we can begin Week 1 execution.

---

## STEP 1 — RE-EVALUATE THE CURRENT PLAN

| Recommendation | Keep | Modify | Remove | Reason |
| :--- | :--- | :--- | :--- | :--- |
| Use Supabase Auth | Keep | | | Essential for secure, production-grade JWT sessions. High ROI, low effort. |
| Split `server.js` | Keep | | | Monoliths look bad on GitHub. MVC shows maturity to recruiters. |
| Stream uploads to Supabase | Keep | | | In-memory Multer crashes the server. Fixing this shows system design competence. |
| Use Gemini for Embeddings | | | Remove | API keys cost money/rate limits. We are switching to local/free HuggingFace. |
| Use Gemini for Chat | | | Remove | Swapping to Groq (Llama 3.3 70B) gives 10x faster inference and better "wow" factor. |
| Implement `pgvector` | Keep | | | This is the absolute core of the AI engineer narrative. Must have. |

---

## STEP 2 — MIGRATE FROM GEMINI TO GROQ + HUGGING FACE

### 🧠 LLM Selection (Groq)
**Winner**: **Llama 3.3 70B Versatile**
*Why?*
- **Speed**: Groq's LPU makes Llama 3.3 70B generate at ~300+ tokens per second. The UI will feel instant, which is incredible for demos.
- **Why not DeepSeek R1?** R1 is a reasoning model. We don't need chain-of-thought for simple academic RAG; it introduces unnecessary latency (TTFT) and verbosity.
- **Why not Qwen?** Llama 3.3 70B has superior instruction-following for JSON output (needed for quizzes/flashcards).

### 📐 Embeddings Selection (Hugging Face)
**Winner**: **BAAI/bge-small-en-v1.5**
*Why?*
- `all-MiniLM-L6-v2` is older and scores lower on the MTEB leaderboard.
- `bge-base` is slightly more accurate but heavier.
- `bge-small` is the sweet spot: produces 384-dimensional vectors, runs blazing fast locally or via free HF API, and beats MiniLM in retrieval accuracy. It shows recruiters you know current SOTA open-source models.

### 🗄️ Vector Database (Supabase + pgvector)
- **Table**: `document_chunks`
- **Structure**: `id (uuid)`, `document_id (uuid)`, `content (text)`, `embedding (vector(384))`, `metadata (jsonb)`
- **Index**: `HNSW` (Hierarchical Navigable Small World) index for fast approximate nearest neighbor search. Shows advanced DB knowledge over flat indexing.
- **Retrieval Strategy**: Supabase RPC function (`match_documents`) using Cosine Similarity (`<=>`).

---

## STEP 3 — TRUE RAG ARCHITECTURE

We are ripping out the fake TF-IDF `geminiClient.js` completely.

**The Pipeline:**
1. **Document Upload**: React POSTs file to Express (`/api/documents/upload`).
2. **Storage**: Express streams file directly to Supabase Storage.
3. **Parsing**: `pdf-parse` extracts raw text.
4. **Chunking**: Use LangChain `RecursiveCharacterTextSplitter` (chunk: 800 chars, overlap: 150).
5. **Embedding**: Express calls Hugging Face Inference API (`bge-small-en-v1.5`) to embed chunks.
6. **Vector DB**: Insert chunks into Supabase `document_chunks` table.
7. **Query**: User types chat. Express embeds query via HF.
8. **Vector Search**: Supabase RPC finds top 5 chunks.
9. **Context Injection**: Build prompt: `"Context: [Chunks] Question: [Query]"`.
10. **Groq Generation**: Call Groq API (Llama 3.3 70B) to stream answer.
11. **Citation Rendering**: Return chunk IDs to frontend to render `[1]` clickable citation pills.

---

## STEP 4 — RECRUITER WOW FACTOR FEATURES

| Feature | Recruiter Impact | Difficulty | Time | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Smart Semantic Search** | ⭐⭐⭐⭐⭐ | Medium | 1 Day | **DO THIS**. Replaces traditional keyword search. Shows core NLP skills. |
| **Research Assistant (Citations)** | ⭐⭐⭐⭐⭐ | Hard | 3 Days | **DO THIS**. This is the "Perplexity clone" feature. Highest ROI for AI/ML roles. |
| **AI Quiz/Flashcard Generator** | ⭐⭐⭐⭐ | Medium | 2 Days | **DO THIS**. Structured JSON output from Groq. Shows product-minded AI engineering. |
| **AI Course Companion** | ⭐⭐⭐ | Hard | 1 Week | **SKIP**. Requires complex memory, session state, and agentic loops. Too much time. |
| **Knowledge Graph** | ⭐⭐ | Hard | 1 Week | **SKIP**. D3.js/ReactFlow is tedious. Looks cool but low actual ML value. |

---

## STEP 5 — UI REDESIGN (MAJOR)

We want the UI to feel like **Linear meets Perplexity**. Dark mode by default, glassmorphism, high contrast, typography-focused.

- **Colors**: Deep dark gray background (`#0A0A0A`), subtle border lines (`#2A2A2A`), accent color Electric Blue (`#2563EB`) or Violet (`#7C3AED`).
- **Typography**: Inter or Geist for UI, JetBrains Mono for code/citations.
- **New Navigation**: Slim left sidebar (Notion/Linear style). Collapsible.
- **New Search Experience**: Global Command Palette (`Cmd+K`). Blurs background, instant semantic results.
- **New Chat Experience**: Central focused interface. AI responses stream in. Inline citations are small gray pills `[1]` that hover to show the source text snippet.
- **New Document Viewer**: Split pane. Left side: PDF viewer. Right side: Chat interface scoped *specifically* to that document (NotebookLM style).

---

## STEP 6 — WHAT SHOULD BE DELETED?

| File / Folder | Delete? | Why? | Risk |
| :--- | :--- | :--- | :--- |
| `backend/api/geminiClient.js` | **YES** | It's a 680-line fake RAG implementation with hardcoded if-statements. | Low. Replaced by a 50-line LangChain/Groq script. |
| `backend/database/firebaseUtils.js` | **YES** | Wraps Supabase in an oddly named Firebase wrapper. Confusing architecture. | Low. Direct Supabase JS client is cleaner. |
| `frontend/src/pages/AdminConsole.jsx` | **YES** | Overly complex admin panel. Not relevant to the core "AI Assistant" narrative. | Low. Focus on the student/knowledge experience. |
| `frontend/src/pages/TeacherDashboard.jsx` | **YES** | Redundant. Combine upload logic into a unified interface. | Low. |

---

## STEP 7 — WHAT SHOULD BE REUSED?

| File / Folder | Reuse? | Why? | Changes Needed |
| :--- | :--- | :--- | :--- |
| `backend/api/pdfExtractor.js` | **YES** | The Mammoth/PDF-parse logic works fine for extracting raw text. | Just strip out the weird ASCII fallback code and keep it simple. |
| `frontend/src/components/ResearchChat.jsx` | **YES** | Good skeleton for the chat UI. | Add Markdown rendering (`react-markdown`) and citation pill logic. |
| `frontend/src/components/PaperViewer.jsx` | **YES** | PDF rendering skeleton. | Update styling to fit the split-pane NotebookLM design. |
| `backend/server.js` | **YES (Parts)** | Express setup is fine. | Strip out the monolithic routes into `/routes/ai.js` and `/routes/docs.js`. |

---

## STEP 8 — FINAL ARCHITECTURE

### Backend (`Node.js / Express`)
```text
/backend
  /controllers
    - authController.js
    - documentController.js
    - aiController.js       <-- Groq & HF logic here
  /services
    - pgvectorService.js    <-- Supabase embeddings operations
    - textProcessing.js     <-- Chunking & PDF parsing
```

### Database (`Supabase`)
- `users`: id, email, role
- `documents`: id, title, storage_url, created_at
- `document_chunks`: id, document_id, content, embedding `vector(384)`

### AI Layer
- **LangChain.js**: For orchestrating the chunking and prompt templating.
- **HuggingFace Inference API**: Generate 384-d vectors (`bge-small-en-v1.5`).
- **Groq SDK**: Fast LLM inference (`Llama-3.3-70b-versatile`).

---

## STEP 9 — EXECUTION ROADMAP (ONE STUDENT, 4 WEEKS)

### Week 1: Infrastructure & Cleanup (The Purge)
- **Task 1**: Delete fake AI logic, `TeacherDashboard`, `AdminConsole`. (2 hrs)
- **Task 2**: Refactor `server.js` into modular routes/controllers. (4 hrs)
- **Task 3**: Setup Supabase tables with `pgvector` and `HNSW` indexes. (2 hrs)
- *Outcome*: A clean, modular Express backend ready for real AI.

### Week 2: True RAG & Embeddings (The Brain)
- **Task 1**: Implement `textProcessing.js` with LangChain text splitters. (3 hrs)
- **Task 2**: Connect HuggingFace API to generate `bge-small` embeddings on upload. (4 hrs)
- **Task 3**: Write Supabase RPC function for Cosine Similarity search. (2 hrs)
- *Outcome*: Documents can be uploaded, chunked, embedded, and semantically searched.

### Week 3: Groq Chat & Citations (The Voice)
- **Task 1**: Connect Groq SDK to the chat endpoint. (2 hrs)
- **Task 2**: Construct prompt dynamically injecting the top 5 chunks from Supabase. (3 hrs)
- **Task 3**: Update `ResearchChat.jsx` to render Markdown and `[1]` citation pills based on returned chunks. (5 hrs)
- *Outcome*: A working Perplexity/NotebookLM clone.

### Week 4: UX Polish & "Cmd+K" (The Wow Factor)
- **Task 1**: Implement the global `Cmd+K` command palette for instant semantic search. (4 hrs)
- **Task 2**: Add an endpoint for "Generate Quiz" (Groq JSON mode) and UI button. (4 hrs)
- **Task 3**: Final CSS polish (Linear dark mode style, animations). (4 hrs)
- *Outcome*: A production-grade, stunning portfolio piece.

---

## STEP 10 — FINAL PROJECT VISION

**Project Name**: *Lumina AI* (or *Nexus Knowledge Base*)
**Elevator Pitch**: "An open-source NotebookLM alternative for universities. It uses pgvector, HuggingFace embeddings, and Groq's LPU inference to instantly transform course materials into a conversational, citation-backed AI assistant."

**Resume Bullet Points**:
- *Architected a Retrieval-Augmented Generation (RAG) pipeline using Node.js, Supabase `pgvector`, and LangChain, enabling sub-second semantic search across hundreds of academic documents.*
- *Replaced legacy keyword search with `BAAI/bge-small-en-v1.5` embeddings and an HNSW index, increasing retrieval relevance and reducing hallucination.*
- *Integrated Groq (Llama-3.3-70b) to deliver real-time, streaming AI responses with verifiable inline citations (Perplexity-style).*
- *Redesigned the UI using React and TailwindCSS into a modern, accessible split-pane workspace inspired by NotebookLM and Linear.*

**Why Recruiters Will Be Impressed**:
This proves you aren't just an "API wrapper" developer. You understand the math/architecture behind RAG (chunking, dimensions, HNSW, cosine similarity), you optimize for latency and cost (Groq + local/HF embeddings vs paying for OpenAI/Gemini), and you have strong full-stack product sensibilities. This is the exact profile modern AI startups and big tech are hiring for.
