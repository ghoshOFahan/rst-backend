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
  getLastWord,
  pushWord,
  getWords,
  WORD_HISTORY_KEY,
  findWord,
} from "./helpers/redis_helper.js";
import { judgeWords } from "./ai/judge.js";
import { getFunnyComment } from "./ai/aiCommentator.js";

const app = express();
const httpServer = createServer(app);
const redis = new Redis(process.env.REDIS_URL!);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
const pendingTimeouts: Map<string, NodeJS.Timeout> = new Map();
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
function getNextActivePlayerId(players: any[], currentId: string) {
  const currentIndex = players.findIndex((p) => p.id === currentId);
  if (currentIndex === -1) return currentId;
  let nextIndex = (currentIndex + 1) % players.length;
  while (players[nextIndex].isEliminated && nextIndex !== currentIndex) {
    nextIndex = (nextIndex + 1) % players.length;
  }
  return players[nextIndex].id;
}
io.on("connection", (socket) => {
  console.log("client connected");

  //CREATION EVENT HANDLER
  socket.on("createRoom", async ({ username, maxPlayers, clientId }) => {
    if (!clientId) {
      socket.emit("gameError", "clientId missing");
      return;
    }
    const roomId = generateRoomId();
    const newGame: GameState = {
      roomId: roomId,
      players: [{ id: socket.id, username, clientId }],
      maxPlayers: maxPlayers || 4,
      status: "LOBBY",
      currentPlayerId: socket.id,
      isAiThinking: false,
      wordHistory: [],
    };
    await setGame(redis, roomId, newGame);
    await setSocketRoom(redis, socket.id, roomId);
    socket.join(roomId);
    socket.emit("gameStateUpdate", newGame);
    console.log("Lobby created by:", username);
  });

  //JOIN EVENT HANDLER
  socket.on("joinRoom", async ({ username, roomId, clientId }) => {
    if (!clientId) {
      socket.emit("gameError", "clientId missing");
      return;
    }
    const gameState = await getGame(redis, roomId);
    if (gameState === null) return socket.emit("gameError", "game not found");
    if (
      gameState.players.length >= gameState.maxPlayers ||
      gameState.status === "INGAME" ||
      gameState.status === "FINISHED"
    ) {
      return socket.emit("gameError", "There was some error in joining room");
    }
    const alreadyInRoom = gameState.players.some(
      (p) => p.clientId === clientId
    );

    if (alreadyInRoom) {
      socket.emit("gameError", "player already in room");
      return;
    }
    gameState.players.push({ id: socket.id, username: username, clientId });
    if (gameState.players.length === gameState.maxPlayers) {
      gameState.status = "INGAME";
      console.log(
        "Player joined:",
        username,
        "clientId:",
        clientId,
        "socketId:",
        socket.id,
        "room:",
        roomId
      );
    }
    await setGame(redis, roomId, gameState);
    await setSocketRoom(redis, socket.id, roomId);
    socket.join(roomId);
    //Broadcasting new state to every player in room
    io.to(roomId).emit("gameStateUpdate", gameState);
  });
  //SUBMIT WORD HANDLER
  socket.on("submitWord", async ({ roomId, word }) => {
    const gameState = await getGame(redis, roomId);
    if (!gameState) {
      console.log("gamestate not found for the room :", roomId);
      return;
    }
    if (gameState.currentPlayerId !== socket.id) {
      console.warn("Out-of-turn submission blocked", socket.id);
      return;
    }
    io.to(roomId).emit("aiThinking", {
      roomId: roomId,
      isThinking: true,
    });
    const playerId = socket.id;
    const playerObject = gameState.players.find((p) => p.id === playerId);
    const playerName = playerObject ? playerObject.username : "A player";
    const startsWithRST = /^[rst]/i.test(word);
    let ruling = { isValid: false, score: 0 };
    let eliminationReason = "";
    let rstOccurred = false;
    let unrelatedOccurred = false;
    let repeatedOccurred = false;
    if (startsWithRST) {
      console.log(`Player ${playerId} fell into the RST trap!`);
      ruling.isValid = false;
      rstOccurred = true;
      eliminationReason = `Player ${playerName} used word "${word}" which starts with R/S/T`;
    } else if (await findWord(redis, roomId, word)) {
      console.log("Word has been used before");
      repeatedOccurred = true;
      eliminationReason = `Word has been used before and therefore player ${playerName} is disqualified`;
    } else {
      const lastWord = await getLastWord(redis, roomId);
      if (!lastWord) {
        console.log("redis returned no last word");
      } else {
        console.log("Last word now will be validating it");
      }
      ruling = lastWord
        ? await judgeWords(lastWord, word)
        : { score: 1, isValid: true };
      if (!ruling.isValid) {
        console.log("Word is not related to previous word");
        unrelatedOccurred = true;
        eliminationReason = `${playerName} entered ${word} and it is not related to ${lastWord}`;
      }
    }
    if (ruling.isValid) {
      await pushWord(redis, roomId, word);
      gameState.currentPlayerId = getNextActivePlayerId(
        gameState.players,
        playerId
      );
      await setGame(redis, roomId, gameState);
    } else {
      console.log(`Eliminating player ${playerId}`);

      const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
      if (playerIndex !== -1 && gameState) {
        gameState.players[playerIndex]!.isEliminated = true;
      }
      const activePlayers = gameState.players.filter((p) => !p.isEliminated);
      if (activePlayers.length <= 1) {
        gameState.status = "FINISHED";
        gameState.winner =
          activePlayers.length === 1 ? activePlayers[0]!.username : "No One";
        await setGame(redis, roomId, gameState);
        const fullHistory = await getWords(redis, roomId);
        const lastValidWord = await getLastWord(redis, roomId);
        const gameSummary = `
          Winner: ${gameState.winner}
          Players: ${gameState.players
            .map((p) => `${p.username}:${p.isEliminated ? "OUT" : "IN"}`)
            .join(", ")}
          WordChain: ${fullHistory.join(" -> ")}
          Elimination events:
            Rejected Word: "${word}"
            Previous Valid Word: "${lastValidWord}"
            Reason: ${eliminationReason}
          LossFlags:
            rstOccurred: ${rstOccurred}
            repeatedOccurred: ${repeatedOccurred}
            unrelatedOccurred: ${unrelatedOccurred}
        `;
        let commentary =
          "The AI is taking a nap (Rate Limit hit), but congrats on the game!";

        try {
          commentary = await getFunnyComment(gameSummary);
        } catch (error) {
          console.error("AI Commentary failed due to rate limit:", error);
          commentary =
            "Review the word chain above! (AI Commentator is currently overloaded)";
        }
        io.to(roomId).emit("gameEnded", {
          gameState,
          commentary,
        });
      } else {
        // Game continues, pass turn to next survivor
        gameState.currentPlayerId = getNextActivePlayerId(
          gameState.players,
          playerId
        );
        await setGame(redis, roomId, gameState);
      }
    }
    const fullHistory = await getWords(redis, roomId);
    const mergedState = {
      ...gameState,
      wordHistory: fullHistory,
    };
    io.to(roomId).emit("aiRuled", {
      roomId,
      playerId,
      playerName:
        gameState.players.find((p) => p.id === playerId)?.username ??
        "error in fetching name",
      lastWord: await getLastWord(redis, roomId),
      newWord: word,
      score: ruling.score,
      isValid: ruling.isValid,
      isEliminated: !ruling.isValid,
      reason: eliminationReason,
    });
    io.to(roomId).emit("gameStateUpdate", mergedState);
    io.to(roomId).emit("aiThinking", { roomId, isThinking: false });
  });

  //RECONNECTION EVENT HANDLER
  socket.on("reconnectRoom", async ({ roomId, clientId }) => {
    if (!clientId) {
      socket.emit("gameError", "clientId missing");
      return;
    }
    try {
      const gameState = await getGame(redis, roomId);
      if (!gameState) {
        socket.emit("gameError", "game not found");
        return;
      }

      const player = gameState.players.find((p) => p.clientId === clientId);
      if (!player) {
        socket.emit("gameError", "player not found");
        return;
      }
      if (pendingTimeouts.has(player.id)) {
        clearTimeout(pendingTimeouts.get(player.id)!);
        pendingTimeouts.delete(player.id);
      }
      await redis.del(SOCKET_ROOM_KEY(player.id));
      player.id = socket.id;

      await setSocketRoom(redis, socket.id, roomId);
      await setGame(redis, roomId, gameState);

      socket.join(roomId);
      socket.emit("gameStateUpdate", gameState);
      io.to(roomId).emit("gameStateUpdate", gameState);

      console.log("Player reconnected:", player.username);
    } catch (err) {
      console.error("Reconnect failed", err);
      socket.emit("gameError", "reconnect failed");
    }
  });
  //LEAVE ROOM EVENT HANDLER
  socket.on("leaveRoom", async ({ roomId, clientId }) => {
    if (!clientId) {
      socket.emit("gameError", "clientId missing");
      return;
    }
    try {
      const gameState = await getGame(redis, roomId);
      if (!gameState) return;

      const player = gameState.players.find((p) => p.clientId === clientId);
      if (!player) return;

      console.log(`Player ${player.username} explicitly left room ${roomId}`);

      // cancel pending disconnect cleanup
      if (pendingTimeouts.has(player.id)) {
        clearTimeout(pendingTimeouts.get(player.id)!);
        pendingTimeouts.delete(player.id);
      }

      await handlePlayerExit(player.id, clientId, roomId);
    } catch (error) {
      console.error("Error handling leaveRoom", error);
    }
  });
  async function handlePlayerExit(
    socketId: string,
    clientId: string,
    roomId: string
  ) {
    const gameState = await getGame(redis, roomId);
    if (!gameState) return;

    const updatedPlayers = gameState.players.filter(
      (p) => p.clientId !== clientId
    );

    if (updatedPlayers.length === 0) {
      await redis.del(GAME_SET_KEY(roomId));
      await redis.del(WORD_HISTORY_KEY(roomId));
      console.log("Room %s closed and deleted.", roomId);
    } else {
      gameState.players = updatedPlayers;

      if (gameState.currentPlayerId === socketId) {
        gameState.currentPlayerId = getNextActivePlayerId(
          gameState.players,
          socketId
        );
      }

      await setGame(redis, roomId, gameState);
      io.to(roomId).emit("gameStateUpdate", gameState);
    }

    await redis.del(SOCKET_ROOM_KEY(socketId));
  }

  //DISCONNECTION EVENT HANDLER
  socket.on("disconnect", async () => {
    try {
      const GRACE_PERIOD = 12000;

      const roomId = await getSocketRoom(socket.id, redis);
      if (!roomId) return;

      const gameState = await getGame(redis, roomId);
      if (!gameState) return;

      const disconnectedPlayer = gameState.players.find(
        (p) => p.id === socket.id
      );
      if (!disconnectedPlayer) return;
      const clientId = disconnectedPlayer.clientId;
      if (pendingTimeouts.has(socket.id)) {
        clearTimeout(pendingTimeouts.get(socket.id)!);
        pendingTimeouts.delete(socket.id);
      }

      const cleanupTimeout = setTimeout(() => {
        (async () => {
          try {
            const latestGame = await getGame(redis, roomId);
            if (!latestGame) return;
            const reconnected = latestGame.players.some(
              (p) => p.clientId === clientId && p.id !== socket.id
            );
            if (reconnected) return;

            await handlePlayerExit(socket.id, clientId, roomId);
          } catch (error) {
            console.error("Error during disconnect cleanup", error);
          } finally {
            pendingTimeouts.delete(socket.id);
          }
        })();
      }, GRACE_PERIOD);

      pendingTimeouts.set(socket.id, cleanupTimeout);

      console.log(
        "player %s has %dms grace period in room %s",
        socket.id,
        GRACE_PERIOD,
        roomId
      );
    } catch (error) {
      console.error("Error handling disconnect", error);
      if (pendingTimeouts.has(socket.id)) {
        clearTimeout(pendingTimeouts.get(socket.id)!);
        pendingTimeouts.delete(socket.id);
      }
    }
  });
});
app.get("/", (req: Request, res: Response) => {
  res.send(`<h1>hey there welcome to rst!</h1>`);
});
httpServer.listen(port, host, () => {
  if (process.env.PORT) {
    console.log("service is live and listening on port %d", port);
  } else {
    console.log("you can access the page locally at http://localhost:%d", port);
  }
});
