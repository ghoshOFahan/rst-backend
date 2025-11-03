export interface GameState {
  roomId: string;
  players: string[];
  maxPlayers: number;
  status: "LOBBY" | "INGAME" | "FINISHED";
}
