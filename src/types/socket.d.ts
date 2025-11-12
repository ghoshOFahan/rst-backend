import type { GameState } from "./game.js";

export interface ServerToClientEvents {
  gameStateUpdate: (game: GameState) => void;
  gameError: (error: string) => void;
}

export interface ClientToServerEvents {
  createRoom: ({ username, maxPlayers }) => void;
  joinRoom: ({ username, roomId }) => void;
  reconnectRoom: (oldsocketid) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  name: string;
  age: number;
}
