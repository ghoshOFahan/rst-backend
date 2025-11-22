import chalk from "chalk";
export function cosinesimilarity1(a, b) {
    if (a.length != b.length)
        return;
    var magA = 0;
    var magB = 0;
    var dot = 0;
    for (var i = 0; i < a.length; i++) {
        magA += a[i] * a[i];
        magB += b[i] * b[i];
        dot += a[i] * b[i];
    }
    const cosineresult = dot / (Math.sqrt(magA) * Math.sqrt(magB));
    console.log(chalk.yellow(cosineresult));
}
cosinesimilarity1([1, 2, 3], [3, 4, 5]);
//# sourceMappingURL=cosinesimilarity.js.map