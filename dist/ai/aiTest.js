import { getFunnyComment } from "./aiCommentator.js";
async function runTest() {
    console.log("Running Gemini 2.0 Flash comment test...");
    const fakeGameSummary = `
  Game Summary:
Winner: Arjun
Final Word: "kaleidoscope"
Previous Word: "bangles"
Total Rounds: 12
Eliminated Players: Suresh, Mihir

Turn-by-Term History:
Turn 1: [Starting player] played "apple" → [Next player] played "elephant"
Turn 2: [Player] played "tiger" → [Player] played "rhinoceros"
Turn 3: [Player] played "squirrel" → [Player] played "leopard"
Turn 4: [Player] played "tiger" → [Player] played "raccoon"
Turn 5: [Player] played "newt" → [Player] played "tortoise"
Turn 6: [Player] played "elephant" → [Player] played "tiger"
Turn 7: [Player] played "raccoon" → [Player] played "elephant"
Turn 8: [Player] played "tiger" → [Player] played "raccoon"
Turn 9: [Player] played "newt" → [Player] played "tortoise"
Turn 10: [Player] played "elephant" → [Player] played "tiger"
Turn 11: [Player] played "raccoon" → [Player] played "bangles" (Suresh eliminated)
Turn 12: [Player] played "elephant" → [Player] played "kaleidoscope" (Mihir eliminated, Arjun wins)

Key Events:
- Suresh eliminated on Turn 11 after playing "bangles"
- Mihir eliminated on Turn 12 after playing "kaleidoscope"
- Arjun won by being the last player remaining
  `;
    try {
        const comment = await getFunnyComment(fakeGameSummary);
        console.log("\n🎉 Gemini Comment Output:");
        console.log(comment);
    }
    catch (err) {
        console.error("❌ Error:", err);
    }
}
runTest();
//# sourceMappingURL=aiTest.js.map