const { createRoom, messages } = require("./controllers/user.controller");

async function socketHandler(io) {
  io.on("connecting", () => console.log("Connecting..."));
  io.on("connection", (socket) => {
    console.log("connected!", socket.id);
    socket.emit("onboard", "Welcom new user!");

    socket.on("setUsername", (username) => {
      socket.broadcast.emit("joins", `${username} join the chat`);
    });
    socket.on("chat", (msg) => {
      socket.broadcast.emit("chat", msg);
    });
    socket.on("join_private_chat", async function (data) {
      const { roomName } = data;
      socket.join(roomName);
      await createRoom(roomName);
    });
    socket.on("send_private_message", async (messageObj) => {
      socket.in(messageObj.roomName).emit("private_message", messageObj);
      await messages(messageObj);
    });
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
}
module.exports = socketHandler;
