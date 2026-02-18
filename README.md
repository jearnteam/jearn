# J
# E
# A
# R
# N

> **JEARN** — A Social Learning Network built for knowledge sharing, collaboration, and community growth.  
> Graduation project → Future startup vision.

---

# Vision

JEARN is more than a school SNS.

It is designed to become:

- 📚 A knowledge-sharing ecosystem
- 🧠 A structured learning platform
- 💬 A real-time collaborative space
- 🚀 A scalable tech product
- 🏢 A future startup foundation

Originally built as a graduation project at Japan Electronics College, JEARN is designed with long-term scalability and production-readiness in mind.

---

# Core Philosophy

- Structured content, not chaos
- Real-time interaction
- Clean architecture
- Mobile-first experience
- Performance-first design
- Expandable AI integration
- Scalable infrastructure

---

# Feature Overview

## Posts System
- Rich content editor (TipTap v3)
- Post types:
  - Standard Post
  - Question
  - Poll
  - Video
  - Answer
- Categories + Tags
- Mentions (`@username`)
- Post references (internal linking)
- Link Cards (OGP powered)
- Embed blocks (YouTube, Spotify, X, JEARN links)
- Code blocks (Prism-based)
- Math rendering (LaTeX support)
- Media uploads (image + video via Cloudflare R2)
- Optimistic UI updates

---

## Poll System
- Single choice / Multiple choice
- Real-time vote updates
- Optimistic voting
- Usage analytics

---

## Chat System (WebSocket-based)
- Private 1:1 chat
- Chat rooms
- Unread message tracking
- Infinite scroll
- Scroll anchor restoration
- Partner avatar + metadata
- Lightweight WebSocket server (`ws`)

---

## Notifications
- SSE-based real-time updates
- Unread counts
- Event-based triggering
- Lightweight streaming architecture

---

## Graph View
- Built using `vis-network`
- Visual relationship mapping:
  - Posts
  - Authors
  - Tags
  - Categories
  - Mentions
  - References
- Interactive nodes
- Dynamic layout
- Performance-aware rendering

---

## Study Tracking
- Quiz attempts (JLPT N5–N1)
- Calendar heatmap
- Daily progress tracking
- Attempt analytics
- MongoDB-backed attempt storage

---

## Authentication
- NextAuth
- Google OAuth
- Role-based access (admin support)
- MongoDBAdapter
- Planned: username/password login for broader adoption

---

## AI Integration (Microservice)
- Python FastAPI service
- ML model (joblib pipeline)
- Automatic category suggestion
- Keyword-based fallback
- Future: content intelligence expansion

---

# 🏗 Architecture

JEARN follows a modular architecture inspired by clean separation of concerns.

## Folder Structure


---

# 🛠 Tech Stack

## Frontend
- Next.js (App Router)
- TypeScript
- React 18+
- TailwindCSS
- Framer Motion
- TipTap v3
- vis-network
- Lucide Icons

## Backend
- Next.js Route Handlers
- MongoDB
- Server-Sent Events (SSE)
- WebSocket (ws)

## AI Service
- Python
- FastAPI
- joblib ML pipeline

## Storage
- Cloudflare R2 (S3 compatible)

## Infrastructure
- Docker Compose (multi-service)
- Node.js 20+
- Linux-based development

