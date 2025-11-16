import { Redis } from "ioredis";
import type { GameState } from "../types/game.js";
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
