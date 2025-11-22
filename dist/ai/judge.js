import { embedWord, cosineSimilarity } from "./embeddingJudge.js";
export async function judgeWords(lastWord, newWord) {
    const [a, b] = await Promise.all([embedWord(lastWord), embedWord(newWord)]);
    const score = cosineSimilarity(a, b);
    const isValid = score >= 0.45;
    return {
        score,
        isValid,
    };
}
//# sourceMappingURL=judge.js.map