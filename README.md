# RST – Real-Time Word Chain Game (Backend)

Repository: https://github.com/ghoshOFahan/rst-backend  

---

## @Overview

This repository contains the authoritative backend server for **RST**, a real-time multiplayer word-chain game.  
Implemented as a standalone **Node.js + Express + Socket.IO** service, it enforces all game rules, manages real-time state via Redis, and integrates AI-based validation.

---

## @Tech Stack

- Runtime: Node.js
- Language: TypeScript (ES Modules)
- Framework: Express
- Database: Redis (ioredis) for high-speed persistence
- AI Services: Google Generative AI (Gemini) and Embedding Models
- Deployment: Render

---

## @Core Architecture

### @Server Authority Model
The backend is the **single source of truth**. All critical decisions are enforced on the server, including player eligibility, word validity, and player elimination.

### @Redis-Based State Management
Redis is used instead of volatile in-memory storage to ensure stability. This supports:
- Persistence for room and player data
- Word history tracking for each active game
- Reliable reconnection handling and crash resilience

---

## @AI Architecture



### @Generative AI Judge
- Utilizes structured outputs enforced by schemas
- Returns a boolean validity flag and contextual, witty commentary

### @Embedding-Based Scorekeeper
- Calculates **Cosine Similarity** between words for ultra-fast validation
- Acts as a cost-efficient, high-speed fallback for the generative system

---

## @Game Lifecycle

1. **Validation**: Server verifies turn ownership and the "RST rule" (words must not start with R, S, or T)
2. **AI Processing**: AI validates the word's relationship to the chain
3. **State Update**: Authoritative updates are saved to Redis
4. **Broadcast**: Updated state is emitted to all connected clients

---

## @Reconnection Handling

- Players are identified via persistent client identifiers
- Socket IDs are remapped to existing player profiles in Redis upon reconnect
- Automatic room cleanup when no players remain active

---

## @Environment Variables

Create a `.env` file:

```env
PORT=4000
REDIS_URL=redis://your-redis-url
FRONTEND_URL=https://frontend url get from frontend
GOOGLE_API_KEY=your_google_api_key
