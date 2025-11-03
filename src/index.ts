import "dotenv/config";
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Redis } from "ioredis";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types/socket.js";
import type { GameState } from "./types/game.js";
import {
  getGame,
  getSocketRoom,
  setGame,
  setSocketRoom,
  GAME_SET_KEY,
  SOCKET_ROOM_KEY,
} from "./helpers/redis_helper.js";

const app = express();
const httpServer = createServer(app);
const redis = new Redis(process.env.REDIS_URL!);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

const port: number = parseInt(process.env.PORT || "4000", 10);
const host = "0.0.0.0";
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

function generateRoomId(): string {
  const character = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (var i = 0; i < 4; i++) {
    result =
      result + character.charAt(Math.floor(Math.random() * character.length));
  }
  return result;
}
io.on("connection", (socket) => {
  console.log("client connected");
  socket.on("createRoom", async ({ username, maxPlayers }, callback) => {
    const roomId = generateRoomId();
    const newGame: GameState = {
      roomId: roomId,
      players: [username],
      maxPlayers: maxPlayers || 4,
      status: "LOBBY",
    };
    await setGame(redis, roomId, newGame);
    await setSocketRoom(redis, roomId, socket.id);
    socket.join(roomId);
    socket.emit("gameStateUpdate", newGame);
    console.log("Lobby created by:", username);
  });
  socket.on("joinRoom", async ({ username, roomId }) => {
    const gameState = await getGame(redis, roomId);
    if (gameState === null) return socket.emit("gameError", "game not found");
    if (
      gameState.players.length >= gameState.maxPlayers ||
      gameState.status === "INGAME" ||
      gameState.status === "FINISHED"
    ) {
      return socket.emit("gameError", "There was some error in joining room");
    }
    gameState.players.push(username);
    if (gameState.players.length === gameState.maxPlayers) {
      gameState.status = "LOBBY";
    }
    await setGame(redis, roomId, gameState);
    await setSocketRoom(redis, roomId, socket.id);
    socket.join(roomId);
    //Broadcasting new state to every player in room
    io.to(roomId).emit("gameStateUpdate", gameState);
  });
  socket.on("disconnect", async () => {
    try {
      const roomId = (await getSocketRoom(redis, socket.id)) ?? null;
      if (!roomId) return;
      const gameState = (await getGame(redis, roomId)) ?? null;
      if (!gameState) return;
      gameState.players = gameState.players.filter((id) => id != socket.id);
      await setGame(redis, roomId, gameState);
      if (gameState.players.length === 0) {
        await redis.del(GAME_SET_KEY(roomId));
        await redis.del(SOCKET_ROOM_KEY(socket.id));
        console.log("Room %s closed because all players left", roomId);
        return;
      }
      await setGame(redis, roomId, gameState);
      await redis.del(SOCKET_ROOM_KEY(socket.id));
    } catch (error) {
      console.error("Error handling disconnect", error);
      return;
    }
  });
});

app.get("/", (req: Request, res: Response) => {
  res.send(`<h1>hey there welcome to rst!</h1>`);
});
httpServer.listen(port, host, () => {
  if (process.env.PORT) {
    console.log("service is live and listening on port%d", port);
  } else {
    console.log("you can access the page locally at http://localhost:%d", port);
  }
});
