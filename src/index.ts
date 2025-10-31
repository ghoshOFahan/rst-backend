import express from "express";
const app = express();
import "dotenv/config";
const port: number = parseInt(process.env.PORT || "4000", 10);
const host = "0.0.0.0";
app.get("/", (req, res) => {
  res.send(`<h1>hey there welcome to rst!</h1>`);
});
app.listen(port, host, () => {
  if (process.env.port) {
    console.log("service is live and listening on port%d", port);
  } else {
    console.log("you can access the page locally at http://localhost:%d", port);
  }
});
