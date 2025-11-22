import { Redis } from "ioredis";
import type { GameState } from "../types/game.js";
export declare const GAME_SET_KEY: (roomId: string) => string;
export declare const SOCKET_ROOM_KEY: (socketId: string) => string;
export declare function setGame(redisClient: Redis, roomId: string, gameState: GameState): Promise<"OK" | null>;
export declare function getGame(redisClient: Redis, roomId: string): Promise<GameState | null>;
export declare function setSocketRoom(redisClient: Redis, socketId: string, roomId: string): Promise<"OK" | null>;
export declare function getSocketRoom(socketId: string, redisClient: Redis): Promise<string | null>;
export declare const WORD_HISTORY_KEY: (roomId: string) => string;
export declare function pushWord(redisClient: Redis, roomId: string, word: string): Promise<void>;
export declare function getLastWord(redisClient: Redis, roomId: string): Promise<string | null>;
export declare function getRecentWord(redisClient: Redis, roomId: string, count?: number): Promise<string[]>;
//# sourceMappingURL=redis_helper.d.ts.map