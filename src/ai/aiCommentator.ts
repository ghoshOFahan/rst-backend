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

There are ONLY THREE possible ways to lose the game:
1) A word begins with R, S, or T (this is called the RST rule).
2) A word is repeated.
3) The words are NOT related enough.

No other loss reasons exist.

GAME SUMMARY (source of truth):
${gameSummary}

MANDATORY INSTRUCTIONS:
- Use ONLY the boolean flags provided in the game summary to determine the loss reason.
- If rstOccurred is true:
  - You MUST clearly mention the RST rule as the reason for loss.
- Else if repeatedOccurred is true:
  - You MUST clearly mention that the word was already used.
- Else if unrelatedOccurred is true:
  - You MUST clearly mention that the words were not related.
- NEVER invent rules, letters, players, locations, or events.
- NEVER imply a loss reason different from the three listed above.

OUTPUT RULES:
- Respond with EXACTLY 3 short precise sentences.
- Congratulate the winner and then explain the loss reason
- Humor must be based ONLY on the confirmed loss reason.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return text.trim();
}
