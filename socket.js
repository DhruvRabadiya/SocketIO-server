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
    socket.on("join_private_chat", (data) => {
      const { roomName } = data;
      socket.join(roomName);
    });
    socket.on("send_private_message", (messageObj) => {
      socket.in(messageObj.roomName).emit("private_message", messageObj);
    });
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
}
module.exports = socketHandler;
