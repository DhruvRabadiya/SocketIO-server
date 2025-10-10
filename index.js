require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { socketHandler, onlineUsers } = require("./socket");
const userRoutes = require("./routes/user.routes");
const connectDb = require("./config/dbConfig");
const PORT = process.env.PORT || 8000;
app.use(express.json());
app.use(cors());
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND,
    methods: ["GET", "POST", "PATCH"],
  },
});

socketHandler(io);

app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  next();
});

app.use("/user", userRoutes);

app.use("/{*any}", (req, res) => {
  res.status(404).send("Page Not Found!!");
});

connectDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed.", err);
  });
