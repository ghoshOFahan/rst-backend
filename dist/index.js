import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { Redis } from "ioredis";
import {
  getGame,
  getSocketRoom,
  setGame,
  setSocketRoom,
  GAME_SET_KEY,
  SOCKET_ROOM_KEY,
  getLastWord,
  pushWord,
} from "./helpers/redis_helper.js";
import { judgeWords } from "./ai/judge.js";
const app = express();
const httpServer = createServer(app);
const redis = new Redis(process.env.REDIS_URL);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
const pendingTimeouts = new Map();
const port = parseInt(process.env.PORT || "4000", 10);
const host = "0.0.0.0";
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});
function generateRoomId() {
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
  //CREATION EVENT HANDLER
  socket.on("createRoom", async ({ username, maxPlayers }) => {
    const roomId = generateRoomId();
    const newGame = {
      roomId: roomId,
      players: [{ id: socket.id, username }],
      maxPlayers: maxPlayers || 4,
      status: "LOBBY",
    };
    await setGame(redis, roomId, newGame);
    await setSocketRoom(redis, socket.id, roomId);
    socket.join(roomId);
    socket.emit("gameStateUpdate", newGame);
    console.log("Lobby created by:", username);
  });
  //JOIN EVENT HANDLER
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
    gameState.players.push({ id: socket.id, username: username });
    if (gameState.players.length === gameState.maxPlayers) {
      gameState.status = "INGAME";
      console.log(`${username} joined the room`);
    }
    await setGame(redis, roomId, gameState);
    await setSocketRoom(redis, socket.id, roomId);
    socket.join(roomId);
    //Broadcasting new state to every player in room
    io.to(roomId).emit("gameStateUpdate", gameState);
  });
  //SUBMIT WORD HANDLER
  socket.on("submitWord", async ({ roomId, word, playerId }) => {
    const gameState = await getGame(redis, roomId);
    if (!gameState) {
      console.log("gamestate not found for the room :", roomId);
      return;
    }
    const player = gameState.players.find((player) => player.id === playerId);
    const playerName = player?.username ?? "unknown player";
    io.to(roomId).emit("aiThinking", {
      roomId: roomId,
      isThinking: true,
    });
    const lastWord = await getLastWord(redis, roomId);
    const ruling = lastWord
      ? await judgeWords(lastWord, word)
      : { score: 1, isValid: true };
    if (ruling.isValid) {
      await pushWord(redis, roomId, word);
    }
    io.to(roomId).emit("aiRuled", {
      roomId,
      playerId,
      playerName,
      lastWord,
      newWord: word,
      score: ruling.score,
      isValid: ruling.isValid,
    });
    io.to(roomId).emit("aiThinking", { roomId, isThinking: false });
  });
  //RECONNECTION EVENT HANDLER
  socket.on("reconnectRoom", async (oldsocketid) => {
    try {
      if (pendingTimeouts.has(oldsocketid)) {
        clearTimeout(pendingTimeouts.get(oldsocketid));
        pendingTimeouts.delete(oldsocketid);
      }
      const roomId = await getSocketRoom(oldsocketid, redis);
      if (!roomId)
        return socket.emit(
          "gameError",
          "could not find room while reconnecting due to roomID"
        );
      const gameState = await getGame(redis, roomId);
      if (!gameState)
        return socket.emit(
          "gameError",
          "could not find gameState while reconnecting due to gamestate"
        );
      if (!gameState.players || !Array.isArray(gameState.players)) {
        return socket.emit(
          "gameError",
          "players array not found in game state"
        );
      }
      const playerIndex = gameState.players.findIndex(
        (player) => player.id === oldsocketid
      );
      if (playerIndex === -1)
        return socket.emit("gameError", "player not found in game");
      gameState.players[playerIndex].id = socket.id;
      //REDIS MAPPINGS UPDATED
      await redis.del(SOCKET_ROOM_KEY(oldsocketid));
      await setSocketRoom(redis, socket.id, roomId);
      await setGame(redis, roomId, gameState);
      socket.join(roomId);
      io.to(roomId).emit("gameStateUpdate", gameState);
      console.log(
        "Player reconnected successfully:",
        gameState.players[playerIndex].username
      );
    } catch (error) {
      console.error("There was some problem reconnecting", error);
      socket.emit("gameError", "Failed to reconnect");
    }
  });
  //DISCONNECTION EVENT HANDLER
  socket.on("disconnect", async () => {
    try {
      const GRACE_PERIOD = 7000;
      const roomId = (await getSocketRoom(socket.id, redis)) ?? null;
      if (!roomId) return;
      const gameState = (await getGame(redis, roomId)) ?? null;
      if (!gameState) return;
      //CANCEL PREVIOUS TIMEOUT IF EXISTS
      if (pendingTimeouts.has(socket.id)) {
        clearTimeout(pendingTimeouts.get(socket.id));
        pendingTimeouts.delete(socket.id);
      }
      //CLEAN UP TIMEOUT FUNCTION
      const cleanupTimeout = setTimeout(() => {
        (async () => {
          try {
            const gameState = (await getGame(redis, roomId)) ?? null;
            if (!gameState) return;
            const updatedPlayers = gameState.players.filter(
              (player) => player.id !== socket.id
            );
            if (updatedPlayers.length === 0) {
              await redis.del(GAME_SET_KEY(roomId));
              console.log("Room %s closed because all players left", roomId);
            } else {
              gameState.players = updatedPlayers;
              await setGame(redis, roomId, gameState);
              io.to(roomId).emit("gameStateUpdate", gameState);
            }
            await redis.del(SOCKET_ROOM_KEY(socket.id));
          } catch (error) {
            console.error("Error during cleanup for player", error);
          } finally {
            pendingTimeouts.delete(socket.id);
          }
        })();
      }, GRACE_PERIOD);
      pendingTimeouts.set(socket.id, cleanupTimeout);
      console.log(
        "player %s has %d grace period left in room%s",
        socket.id,
        GRACE_PERIOD,
        roomId
      );
    } catch (error) {
      console.error("Error handling disconnect", error);
      if (pendingTimeouts.has(socket.id)) {
        clearTimeout(pendingTimeouts.get(socket.id));
        pendingTimeouts.delete(socket.id);
      }
    }
  });
});
app.get("/", (req, res) => {
  res.send(`<h1>hey there welcome to rst!</h1>`);
});
httpServer.listen(port, host, () => {
  if (process.env.PORT) {
    console.log("service is live and listening on port %d", port);
  } else {
    console.log("you can access the page locally at http://localhost:%d", port);
  }
});
