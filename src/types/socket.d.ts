import type { GameState } from "./game.js";

export interface ServerToClientEvents {
  gameStateUpdate: (game: GameState) => void;
  gameError: (error: string) => void;
  aiThinking: (data: { roomId: string; isThinking: boolean }) => void;
  aiRuled: (data: {
    roomId: string;
    playerId: string;
    playerName: string;
    lastWord: string | null;
    newWord: string;
    score: number;
    isValid: boolean;
  }) => void;
}

export interface ClientToServerEvents {
  createRoom: ({ username, maxPlayers }) => void;
  joinRoom: ({ username, roomId }) => void;
  reconnectRoom: (oldsocketid) => void;
  submitWord: ({ roomId, word, playerId }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  name: string;
  age: number;
}
