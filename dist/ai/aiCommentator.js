import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in environment variables.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "models/gemini-2.0-flash-001",
});
export async function getFunnyComment(gameSummary) {
    const prompt = `
You are a witty, playful commentator for a multiplayer word-chain game.
You see the words and find and explain the transition between words.
You ONLY produce a short, funny 3-sentence comment.
Mention the players name and also mention how the players vocabulary saved them and if not explain the reason also

GAME SUMMARY:
${gameSummary}

Respond with ONLY that two sentences.
  `;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.trim();
}
//# sourceMappingURL=aiCommentator.js.map