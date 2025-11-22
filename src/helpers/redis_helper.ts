import { Redis } from "ioredis";
import type { GameState } from "../types/game.js";
//ROOM MAPPING HELPERS
export const GAME_SET_KEY = (roomId: string) => `game:${roomId}`;
export const SOCKET_ROOM_KEY = (socketId: string) => `socketRoom:${socketId}`;
export async function setGame(
  redisClient: Redis,
  roomId: string,
  gameState: GameState
) {
  try {
    const jsonState = JSON.stringify(gameState);
    const result = await redisClient.set(GAME_SET_KEY(roomId), jsonState);
    console.log("Redis Room state saved for", roomId);
    console.log(`Current players:${gameState.players}`);
    return result;
  } catch (error) {
    console.error("Failed to save Room state for", roomId, error);
    return null;
  }
}
export async function getGame(
  redisClient: Redis,
  roomId: string
): Promise<GameState | null> {
  try {
    const gameState = await redisClient.get(GAME_SET_KEY(roomId));
    if (gameState === null) return null;
    return JSON.parse(gameState);
  } catch (error) {
    console.error("Error in fetching details of room", error);
    return null;
  }
}
export async function setSocketRoom(
  redisClient: Redis,
  socketId: string,
  roomId: string
) {
  try {
    const result = await redisClient.set(SOCKET_ROOM_KEY(socketId), roomId);
    return result;
  } catch (error) {
    console.error("Failed to save socket", error);
    return null;
  }
}
export async function getSocketRoom(socketId: string, redisClient: Redis) {
  try {
    const roomId = await redisClient.get(SOCKET_ROOM_KEY(socketId));
    if (roomId == null) return null;
    return roomId;
  } catch (error) {
    console.error("Failed to fetch socket", error);
    return null;
  }
}
// WORD HISTORY HELPERS
export const WORD_HISTORY_KEY = (roomId: string) => `words:${roomId}`;
export async function pushWord(
  redisClient: Redis,
  roomId: string,
  word: string
) {
  try {
    const key = WORD_HISTORY_KEY(roomId);
    await redisClient.rpush(key, word);

    await redisClient.ltrim(key, -100, -1);
    //last 100 words to be kept in db
    console.log(`[Redis] Word added to history for room ${roomId}: ${word}`);
  } catch (error) {
    console.error("Failed to push word to history:", error);
  }
}
export async function getLastWord(redisClient: Redis, roomId: string) {
  try {
    const key = WORD_HISTORY_KEY(roomId);
    const last = await redisClient.lindex(key, -1);
    return last;
  } catch (error) {
    console.error("Failed to fetch last word from history:", error);
    return null;
  }
}
export async function getRecentWord(
  redisClient: Redis,
  roomId: string,
  count = 10
) {
  try {
    const key = WORD_HISTORY_KEY(roomId);
    return await redisClient.lrange(key, -count, -1);
  } catch (error) {
    console.error("Failed to fetch recent words:", error);
    return [];
  }
}
