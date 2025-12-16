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
You are a witty but STRICTLY factual commentator for a multiplayer word-chain game.

There are ONLY TWO possible ways to lose the game:
1) The words are NOT related enough.
2) A word begins with R, S, or T (this is called the RST rule).

No other loss reasons exist.

GAME SUMMARY (source of truth):
${gameSummary}

MANDATORY INSTRUCTIONS:
- Identify which of the TWO loss reasons applies, based ONLY on the game summary.
- Mention the RST rule ONLY if a word actually starts with R, S, or T.
- If the words were unrelated, say so clearly.
- NEVER mention R, S, or T if no word starts with those letters.
- NEVER invent rules, letters, players, or events.

OUTPUT RULES:
- Respond with EXACTLY 2 short, funny sentences.
- If the summary is insufficient to decide, say so explicitly.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return text.trim();
}
