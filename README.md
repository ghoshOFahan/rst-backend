

```md
# RST – Real-Time Word Chain Game (Backend)

Repository: https://github.com/ghoshOFahan/rst-backend  

---

## @Overview

This repository contains the backend server for **RST**, a real-time multiplayer word-chain game.  
It is a standalone **Node.js + Express + Socket.IO** application with **Redis-backed persistence**, deployed on Render.

The backend acts as the **single authority** for game state, rule enforcement, turn validation, and AI judgement.

---

## @Tech Stack

- Runtime: Node.js
- Language: TypeScript (ES Modules)
- Framework: Express
- WebSockets: Socket.IO
- Database: Redis (ioredis)
- AI: Google Generative AI / Embedding Models
- Deployment: Render

---

## @Core Principles

### @Server Authority
Clients cannot:
- Decide turns
- Validate words
- End games

All validation and state transitions occur on the server.

### @Persistent State
Redis is used for:
- Game state storage
- Socket-to-room mappings
- Word history tracking
- Reconnection handling

This avoids in-memory data loss and supports crash resilience.

---

## @Game Lifecycle

1. Validate active player
2. Enforce rule constraints (RST rule, duplicate words)
3. AI-based validation
4. Update Redis-backed game state
5. Broadcast updates to all connected players

---

## @AI Architecture

### @Generative AI Judge
- Uses structured outputs
- Enforced via schema validation
- Returns `isValid` and a factual explanation

### @Embedding-Based Scorekeeper
- Uses vector embeddings
- Computes cosine similarity
- Faster and cost-efficient alternative
- Designed as a non-sacrificial fallback system

---

## @Reconnection Handling

- Players are identified using persistent client identifiers
- Socket IDs are remapped on reconnect
- Grace period before cleanup
- Rooms are deleted automatically when empty

---

## @Run Development Server

```bash
npm run dev
````

---

## @Build

```bash
npm run build
```

---

## @Start

```bash
npm start
```

---

## @Environment Variables

Create a `.env` file:

```env
PORT=4000
REDIS_URL=redis://...
FRONTEND_URL=https://rst.vercel.app
GOOGLE_API_KEY=your_api_key
```

---

## @Deployment

The backend is deployed on **Render**.
External keep-alive pings are recommended to prevent cold starts on free tiers.

---

## @Author

Ahan Ghosh

```
```
