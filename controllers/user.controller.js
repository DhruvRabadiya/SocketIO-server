const Rooms = require("../models/room");
const User = require("../models/users");
const mongoose = require("mongoose");
const { loginToken, registerToken } = require("../services/getToken.service");
const Messages = require("../models/messages");
const Groups = require("../models/group");
const pagination = require("../utils/pagination");
const sendNotification = require("../utils/sendNotification");

async function userLogin(req, res) {
  if (!req.body) {
    return res.status(400).json({ message: "Body Undefined." });
  }
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }
  try {
    const isEmail = /\S+@\S+\.\S+/.test(emailOrUsername);
    let userExists;
    if (isEmail) {
      userExists = await User.findOne({ email: emailOrUsername.toLowerCase() });
    } else {
      userExists = await User.findOne({ username: emailOrUsername });
    }
    if (!userExists) {
      return res
        .status(400)
        .json({ message: "User does not Exists, please register" });
    }
    const hashPass = userExists.password;
    const payload = {
      id: userExists._id,
      username: userExists.username,
      email: userExists.email,
    };
    const { token } = await loginToken(password, hashPass, payload);
    res
      .status(200)
      .header("auth-token", token)
      .json({ message: "Login Successfull", token: token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
async function userRegister(req, res) {
  if (!req.body) {
    return res.status(400).json({ message: "Body undefined." });
  }

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }
  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists !== null) {
      return res
        .status(400)
        .json({ message: "User already exists, Please Login." });
    }
    const { token, hashPass } = await registerToken(email, password);

    const newUser = await User.create({
      username: username,
      email: email.toLowerCase(),
      password: hashPass,
    });

    req.io.emit("new_user_registered", newUser);

    res
      .status(201)
      .json({ token: token, message: "User Registered successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function getAllusers(req, res) {
  const loginUserId = req.user.id;
  try {
    const getAllusers = await User.find(
      { _id: { $ne: loginUserId } },
      { password: 0, addedAt: 0, modifiedAt: 0 }
    );
    res.status(200).json({ getAllusers });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function getUserById(req, res) {
  const userId = req.params.id;
  try {
    const user = await User.find(
      { _id: userId },
      { password: 0, addedAt: 0, modifiedAt: 0 }
    );
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function createRoom(roomName) {
  const [userId1, userId2] = roomName.split("-");

  try {
    const roomExists = await Rooms.findOne({ roomName: roomName });

    if (!roomExists) {
      await Rooms.create({
        roomName: roomName,
        participants: [userId1, userId2],
      });
    }
  } catch (error) {
    throw Error(error);
  }
}

async function sendMessage(req, res) {
  try {
    const senderId = req.user.id;
    const senderUsername = req.user.username;
    const { roomName, isGroupChat, text, tempId } = req.body;
    let conversationId;
    let conversation;

    if (isGroupChat) {
      conversation = await Groups.findById(roomName);
    } else {
      conversation = await Rooms.findOne({ roomName: roomName });
    }
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    conversationId = conversation._id;
    const messageData = {
      conversationId,
      senderId,
      senderUsername,
      text,
      tempId,
      deliveredTo: [senderId],
      readBy: [senderId],
    };
    const savedMessage = await Messages.create(messageData);

    // The logic is now simple because the schemas are the same.
    const recipientIds = conversation.participants.filter(
      (p) => p.toString() !== senderId
    );

    if (recipientIds.length > 0) {
      const recipients = await User.find({ _id: { $in: recipientIds } }).select(
        "fcmTokens"
      );
      const tokens = recipients.flatMap((r) => r.fcmTokens).filter(Boolean);

      if (tokens.length > 0) {
        const notificationTitle = isGroupChat
          ? conversation.groupName
          : senderUsername;
        const notificationBody = text;

        await sendNotification(tokens, notificationTitle, notificationBody, {
          conversationId: conversationId.toString(),
          type: isGroupChat ? "group" : "dm",
          senderId: senderId,
        });
      }
    }

    res.status(201).json({ savedMessage });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to send message", error: error.message });
  }
}
async function getAllMessageOfRoom(req, res) {
  const roomName = req.params.name;
  const pageNo = Number(req.query.pageNo);
  const limitData = 12;

  try {
    const room = await Rooms.findOne({ roomName: roomName });
    if (!room) {
      return res.status(404).json({ message: "Room does not exists!" });
    }
    const pipeline = [
      {
        $match: {
          conversationId: room._id,
        },
      },
      {
        $sort: {
          addedAt: -1,
        },
      },
    ];
    const data = await pagination(Messages, pipeline, pageNo, limitData);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function deleteMessage(req, res) {
  const messageId = req.params.messageId;
  try {
    await Messages.findOneAndUpdate(
      { _id: messageId },
      { isDeleted: true, text: null }
    );
    res.status(200).json({ data: "Message deleted!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function editMessage(req, res) {
  const messageId = req.params.messageId;
  const editedText = req.body.text;
  try {
    await Messages.findOneAndUpdate(
      { _id: messageId },
      { text: editedText, isEdited: true }
    );
    res.status(200).json({ data: "Message Edited." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function createGroup(req, res) {
  try {
    if (!req.body) {
      return res.status(400).json({ data: "Body undefined." });
    }
    const { groupName, groupId, participants } = req.body;
    const createdBy = req.user.id;
    const groupObj = { groupName, groupId, participants, createdBy };

    const newGroup = await Groups.create(groupObj);

    if (newGroup && newGroup.participants) {
      newGroup.participants.forEach((participantId) => {
        const participantSocketId = req.onlineUsers.get(
          participantId.toString()
        );
        if (participantSocketId) {
          req.io.to(participantSocketId).emit("added_to_group", { newGroup });
        }
      });
    }

    res.status(200).json({ data: `${groupName} created successfully.` });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function getGroups(req, res) {
  const userId = req.user.id;
  try {
    if (!userId) {
      return res.status(400).json({ data: "User not found." });
    }
    const groups = await Groups.find({ participants: userId });
    res.status(200).json({ groups });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function getAllGroupMessage(req, res) {
  const groupId = req.params.groupId;
  const pageNo = Number(req.query.pageNo);
  const limitData = 12;
  try {
    const pipeline = [
      {
        $match: {
          conversationId: new mongoose.Types.ObjectId(groupId),
        },
      },
      {
        $sort: {
          addedAt: -1,
        },
      },
    ];
    const data = await pagination(Messages, pipeline, pageNo, limitData);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function getGroupById(req, res) {
  const groupId = req.params.groupId;
  try {
    const group = await Groups.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }
    res.status(200).json({ group });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Some error occured", error: error.message });
  }
}
async function addUserInGroupChat(req, res) {
  const { groupId } = req.params;
  const { userIds, tempId } = req.body;
  try {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(400)
        .json({ message: "An array of userIds is required." });
    }

    const updatedGroup = await Groups.findByIdAndUpdate(
      groupId,
      { $addToSet: { participants: { $each: userIds } } },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found." });
    }

    const addedUsers = await User.find({ _id: { $in: userIds } }, "username");
    const addedUsernames = addedUsers.map((u) => u.username).join(", ");

    const messageObj = {
      conversationId: groupId,
      senderId: req.user.id,
      senderUsername: req.user.username,
      text: `${req.user.username} added ${addedUsernames} to the group.`,
      tempId: tempId,
      isSystem: true,
    };

    const newMessage = await Messages.create(messageObj);

    res.status(200).json({ updatedGroup, newMessage });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while adding the user.",
      error: error.message,
    });
  }
}
async function editGroupName(req, res) {
  const groupId = req.params.groupId;
  const { groupName, tempId } = req.body;
  try {
    const groupExists = await Groups.findOneAndUpdate(
      { _id: groupId },
      { groupName: groupName },
      { new: true }
    );
    if (!groupExists) {
      return res.status(404).json({ data: "Group not found." });
    }

    const messageObj = {
      conversationId: groupId,
      senderId: req.user.id,
      senderUsername: req.user.username,
      text: `${req.user.username} change group name to ${groupName}`,
      tempId: tempId,
    };

    const newMessage = await Messages.create(messageObj);
    res.status(200).json({ groupExists, newMessage });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while editing group name.",
      error: error.message,
    });
  }
}
async function leaveGroup(req, res) {
  const groupId = req.params.groupId;
  const { tempId } = req.body;
  try {
    const groupDetail = await Groups.findOneAndUpdate(
      { _id: groupId },
      { $pull: { participants: req.user.id } },
      { new: true }
    );
    if (!groupDetail) {
      return res.status(404).json({ data: "Group not found." });
    }
    const messageObj = {
      conversationId: groupId,
      senderId: req.user.id,
      senderUsername: req.user.username,
      text: `${req.user.username} has left the group.`,
      tempId: tempId,
    };
    const newMessage = await Messages.create(messageObj);
    res.status(200).json({ groupDetail, newMessage });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while leaving the group.",
      error: error.message,
    });
  }
}
async function saveFcmToken(req, res) {
  try {
    const { newFcmToken, oldFcmToken } = req.body;
    const userId = req.user.id;

    if (!newFcmToken) {
      return res.status(400).json({ message: "New FCM token is required." });
    }

    if (oldFcmToken) {
      await User.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: oldFcmToken },
      });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { fcmTokens: newFcmToken },
    });

    res.status(200).json({ message: "FCM token updated successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update FCM token", error: error.message });
  }
}
async function removeFcmToken(req, res) {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }
    // Use $pull to remove the specific token from the fcmTokens array
    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: token },
    });
    res.status(200).json({ message: "FCM token removed successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to remove FCM token", error: error.message });
  }
}
module.exports = {
  userLogin,
  userRegister,
  getAllusers,
  getUserById,
  createRoom,
  getAllMessageOfRoom,
  deleteMessage,
  editMessage,
  createGroup,
  getGroups,
  sendMessage,
  getAllGroupMessage,
  getGroupById,
  addUserInGroupChat,
  editGroupName,
  leaveGroup,
  saveFcmToken,
  removeFcmToken,
};
