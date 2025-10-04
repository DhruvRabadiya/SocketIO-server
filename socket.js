const { createRoom } = require("./controllers/user.controller");
const jwt = require("jsonwebtoken");
async function socketHandler(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    jwt.verify(token, process.env.PRIVATE_KEY, (err, decoded) => {
      if (err) return next(new Error("Invalid token"));
      socket.user = decoded;
      next();
    });
  });
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
      try {
        await createRoom(roomName);
        socket.emit("room_created", `Joined room ${roomName}`);
      } catch (error) {
        console.error(`Error creating room: ${error.message}`);
        socket.emit("error", {
          message: "Failed to create room. Please try again.",
        });
      }
    });

    socket.on("send_private_message", async (messageObj) => {
      try {
        socket.to(messageObj.roomName).emit("private_message", messageObj);
      } catch (error) {
        console.error(`Error sending message: ${error.message}`);
        socket.emit("error", {
          message: "Failed to send message. Please try again.",
        });
      }
    });

    socket.on("delete_message", async (messageObj) => {
      const { messageId, roomName } = messageObj;
      try {
        socket.to(roomName).emit("message_deleted", { messageId });
      } catch (error) {
        console.error(`Error deleting message: ${error.message}`);
        socket.emit("error", {
          message: "Failed to delete message. Please try again.",
        });
      }
    });

    socket.on("edit_message", async (messageObj) => {
      const { messageId, newText, roomName } = messageObj;
      try {
        socket
          .to(roomName)
          .emit("message_edited", { messageId, newText, isEdited: true });
      } catch (error) {
        console.error(`Error editing message: ${error.message}`);
        socket.emit("error", {
          message: "Failed to edit message. Please try again.",
        });
      }
    });
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
}
module.exports = socketHandler;
