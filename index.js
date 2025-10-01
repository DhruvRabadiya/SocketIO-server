require("dotenv").config();
const express = require("express");
const app = express();

const socketIo = require("socket.io");
const cors = require("cors");
const socketHandler = require("./socket");
const userRoutes = require("./routes/user.routes");
const connectDb = require("./config/dbConfig");
const PORT = process.env.PORT || 8000;
app.use(express.json());
app.use(cors());
app.use("/user", userRoutes);
app.get("/", (req, res) => {
  res.status(200).send("HEllO");
});
connectDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });

    const io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND,
        methods: ["GET", "POST"],
      },
    });

    socketHandler(io);
  })
  .catch((err) => {
    console.error("DB connection failed.", err);
  });
app.use("/{*any}", (req, res) => {
  res.status(404).send("Page Not Found!!");
});
