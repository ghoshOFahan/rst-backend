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
- Use ONLY the boolean flags provided in the game summary to determine the loss reason.
- If rstOccurred is false:
  - You MUST NOT mention R, S, T.
  - You MUST NOT mention letters, alphabets, starting letters, forbidden zones, traps, or anything related to characters.
  - You MUST NOT use metaphors or indirect references related to letters or the alphabet.
- If rstOccurred is true:
  - You MUST clearly mention the RST rule as the reason for loss.
- NEVER invent rules, letters, players, locations, or events.
- NEVER imply a loss reason different from the two listed above.

OUTPUT RULES:
- Respond with EXACTLY 2 short precise sentences.
- Humor must be based ONLY on the confirmed loss reason.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return text.trim();
}
