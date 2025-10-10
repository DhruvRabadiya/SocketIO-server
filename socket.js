const { createRoom } = require("./controllers/user.controller");
const jwt = require("jsonwebtoken");
const onlineUsers = new Map();
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
    console.log(`connected! ${socket.id}, User: ${socket.user.username}`);
    onlineUsers.set(socket.user.id, socket.id);

    io.emit("online_users", Array.from(onlineUsers.keys()));
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
    socket.on("start_typing", (data) => {
      const { roomName } = data;
      const username = socket.user.username;
      socket.to(roomName).emit("user_is_typing", { username });
    });
    socket.on("stop_typing", (data) => {
      const { roomName } = data;
      const username = socket.user.username;
      socket.to(roomName).emit("user_stopped_typing", { username });
    });
    socket.on("leave_room", (data) => {
      socket.leave(data.roomName);
      console.log(`User: ${socket.user.username}, left room: ${data.roomName}`);
    });
    socket.on("rename_group", (data) => {
      const { groupId, updatedGroup, newMessage } = data;
      socket.to(groupId).emit("group_renamed", {
        updatedGroup: updatedGroup,
        newMessage: newMessage,
      });
    });
    socket.on("add_members", (data) => {
      const { groupId, updatedGroup, newMessage, addedUserIds } = data;

      socket.to(groupId).emit("members_added", {
        updatedGroup: updatedGroup,
        newMessage: newMessage,
      });
      if (addedUserIds && Array.isArray(addedUserIds)) {
        addedUserIds.forEach((userId) => {
          const newMemberSocketId = onlineUsers.get(userId);
          if (newMemberSocketId) {
            io.to(newMemberSocketId).emit("added_to_group", {
              newGroup: updatedGroup,
            });
          }
        });
      }
    });
    socket.on("leave_group", (data) => {
      const { groupId, newMessage, updatedGroup } = data;

      socket.to(groupId).emit("member_left", {
        groupId: groupId,
        updatedGroup: updatedGroup,
        newMessage: newMessage,
      });
    });
    socket.on("disconnect", () => {
      console.log(
        `Client disconnected: ${socket.user.username} (${socket.id})`
      );

      onlineUsers.delete(socket.user.id);

      io.emit("online_users", Array.from(onlineUsers.keys()));
    });
  });
}
module.exports = { socketHandler, onlineUsers };
