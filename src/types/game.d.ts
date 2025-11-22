export interface GameState {
  roomId: string;
  players: Array<{ id: string; username: string }>;
  maxPlayers: number;
  status: "LOBBY" | "INGAME" | "FINISHED";
  currentPlayerId: string;
  isAiThinking: boolean;
  wordHistory: string[];
}
