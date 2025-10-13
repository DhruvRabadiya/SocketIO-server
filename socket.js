const { createRoom } = require("./controllers/user.controller");
const jwt = require("jsonwebtoken");
const onlineUsers = new Map();
const Messages = require("./models/messages");
const Rooms = require("./models/room");
const mongoose = require("mongoose");

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

  io.on("connection", (socket) => {
    onlineUsers.set(socket.user.id, socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));

    socket.on("join_private_chat", async function (data) {
      const { roomName, isGroupChat } = data;
      socket.join(roomName);
      if (!isGroupChat) {
        try {
          await createRoom(roomName);
        } catch (error) {
          console.error(`Error creating room: ${error.message}`);
        }
      }
    });

    socket.on("send_private_message", (messageObj) => {
      socket.to(messageObj.roomName).emit("private_message", messageObj);
    });

    socket.on("delete_message", (messageObj) => {
      socket
        .to(messageObj.roomName)
        .emit("message_deleted", { messageId: messageObj.messageId });
    });

    socket.on("edit_message", (messageObj) => {
      socket.to(messageObj.roomName).emit("message_edited", {
        messageId: messageObj.messageId,
        newText: messageObj.newText,
        isEdited: true,
      });
    });

    socket.on("start_typing", (data) => {
      socket
        .to(data.roomName)
        .emit("user_is_typing", { username: socket.user.username });
    });

    socket.on("stop_typing", (data) => {
      socket
        .to(data.roomName)
        .emit("user_stopped_typing", { username: socket.user.username });
    });

    socket.on("leave_room", (data) => {
      socket.leave(data.roomName);
    });

    socket.on("rename_group", (data) => {
      socket.to(data.groupId).emit("group_renamed", {
        updatedGroup: data.updatedGroup,
        newMessage: data.newMessage,
      });
    });

    socket.on("add_members", (data) => {
      socket.to(data.groupId).emit("members_added", {
        updatedGroup: data.updatedGroup,
        newMessage: data.newMessage,
      });
      if (data.addedUserIds && Array.isArray(data.addedUserIds)) {
        data.addedUserIds.forEach((userId) => {
          const newMemberSocketId = onlineUsers.get(userId);
          if (newMemberSocketId) {
            io.to(newMemberSocketId).emit("added_to_group", {
              newGroup: data.updatedGroup,
            });
          }
        });
      }
    });

    socket.on("leave_group", (data) => {
      socket.to(data.groupId).emit("member_left", {
        updatedGroup: data.updatedGroup,
        newMessage: data.newMessage,
      });
    });

    socket.on("message_delivered", async (data) => {
      try {
        const updatedMessage = await Messages.findByIdAndUpdate(
          data.messageId,
          { $addToSet: { deliveredTo: data.userId } },
          { new: true }
        );
        if (updatedMessage) {
          const senderSocketId = onlineUsers.get(
            updatedMessage.senderId.toString()
          );
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_status_update", updatedMessage);
          }
        }
      } catch (error) {
        console.error("Error updating message delivered status:", error);
      }
    });

    socket.on("messages_read", async (data) => {
      const { conversationId, userId } = data;
      try {
        let finalConversationId;
        if (mongoose.Types.ObjectId.isValid(conversationId)) {
          finalConversationId = conversationId;
        } else {
          const room = await Rooms.findOne({ roomName: conversationId });
          if (room) {
            finalConversationId = room._id;
          } else {
            return;
          }
        }

        await Messages.updateMany(
          { conversationId: finalConversationId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );

        io.to(conversationId).emit("conversation_has_been_read", {
          conversationId: conversationId,
          readByUserId: userId,
        });
      } catch (error) {
        console.error("Error updating messages read status:", error);
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.user.id);
      io.emit("online_users", Array.from(onlineUsers.keys()));
    });
  });
}

module.exports = { socketHandler, onlineUsers };
