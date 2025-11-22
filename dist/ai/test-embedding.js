import { getEmbeddings, cosineSimilarity } from "./embeddingJudge.js";
async function testEmbeddingJudge(words) {
    var [emb_a, emb_b] = await getEmbeddings(words);
    if (emb_a && emb_b) {
        console.log("Embeddings generated:");
        console.log(cosineSimilarity(emb_a, emb_b));
    }
}
//# sourceMappingURL=test-embedding.js.map