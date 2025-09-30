require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8000;
const cors = require("cors");
const socketIo = require("socket.io");
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send("HEllO");
});

const server = app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTED,
    methods: ["GET", "POST"],
  },
});
io.on("connecting", () => console.log("Connecting..."));
io.on("connection", (socket) => {
  console.log("connected!", socket.id);
  socket.emit("onboard", "Welcom new user!");
  socket.on("disconnect", () => console.log("Client disconnected"));
});
