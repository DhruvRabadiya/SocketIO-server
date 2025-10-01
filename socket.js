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
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
}
module.exports = socketHandler;
