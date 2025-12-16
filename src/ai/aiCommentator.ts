import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash-lite",
});

export async function getFunnyComment(gameSummary: string): Promise<string> {
  const prompt = `
You are a witty, playful commentator for a multiplayer word-chain game.

Game rule:
- If a word begins with R, S, or T, that player is disqualified (called the RST rule).

GAME SUMMARY:
${gameSummary}

Instructions:
- ONLY comment on events explicitly present in the game summary.
- Mention the RST rule ONLY if a word in the summary actually starts with R, S, or T.
- If no RST violation occurred, clearly say so.
- Explain transitions only if they logically exist.
- If a player's vocabulary did not save them, explain the reason ONLY if it is evident from the summary.
- Do NOT invent letters, players, or rules.

Output rules:
- Respond with EXACTLY 2 short, funny sentences.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return text.trim();
}
