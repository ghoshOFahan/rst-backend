import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in environment variables.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "text-embedding-004",
});
//768-d vector
export async function embedWord(word) {
    const response = await model.embedContent({
        content: {
            role: "user",
            parts: [{ text: word }],
        },
    });
    if (!response.embedding || !response.embedding.values) {
        throw new Error("Embedding generation failed.");
    }
    return response.embedding.values;
}
export async function getEmbeddings(words) {
    const promises = words.map((word) => embedWord(word));
    return Promise.all(promises);
}
export function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error("Vectors must be the same length.");
    }
    let dot = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}
//# sourceMappingURL=embeddingJudge.js.map