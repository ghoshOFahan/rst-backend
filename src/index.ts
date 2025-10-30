import express from "express";
const app = express();
import "dotenv/config";
const port = process.env.PORT;
app.get("/", (req, res) => {
  res.send(`<h1>hey there welcome to rst!</h1>`);
});
app.listen(port, () => {
  console.log("you can access the page locally at http://localhost:%d", port);
});
