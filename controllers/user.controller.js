const Rooms = require("../models/room");
const User = require("../models/users");
const mongoose = require("mongoose");
const { loginToken, registerToken } = require("../services/getToken.service");
const Messages = require("../models/messages");
const Groups = require("../models/group");
const pagination = require("../utils/pagination");

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
    await User.insertOne({
      username: username,
      email: email.toLowerCase(),
      password: hashPass,
    });
    res
      .status(201)
      .json({ token: token, message: "User Registerd successfully." });
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
    const doc = {
      roomName: roomName,
      participants: [
        { userId: new mongoose.Types.ObjectId(userId1) },
        { userId: new mongoose.Types.ObjectId(userId2) },
      ],
    };
    const roomExists = await Rooms.findOne({ roomName: roomName }).populate(
      "participants.userId",
      "username"
    );

    if (roomExists) {
      console.log("Room Exists!!!");
    } else {
      await Rooms.create(doc);
    }
  } catch (error) {
    throw Error(error);
  }
}
// async function messages(msg) {
//   try {
//     const roomId = await Rooms.findOne({ roomName: msg.roomName });
//     const messageObj = {
//       conversationId: roomId._id,
//       senderId: new mongoose.Types.ObjectId(msg.senderId),
//       senderUsername: msg.senderUsername,
//       text: msg.text,
//       tempId: msg.tempId,
//     };
//     const savedMessage = await Messages.create(messageObj);
//     return savedMessage;
//   } catch (error) {
//     throw Error(error);
//   }
// }
async function sendMessage(req, res) {
  try {
    const senderId = req.user.id;
    const { roomName, isGroupChat } = req.body;
    let conversationId;
    if (isGroupChat) {
      const group = await Groups.findById(roomName);
      conversationId = group._id;
    } else {
      const room = await Rooms.findOne({ roomName: roomName });
      conversationId = room._id;
    }

    if (!conversationId) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messageData = { ...req.body, senderId, conversationId };
    const savedMessage = await Messages.create(messageData);
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
      return res.status(200).json([]);
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
  if (!req.body) {
    return res.status(400).json({ data: "Body undefined." });
  }
  const { groupName, groupId, participants } = req.body;
  const createdBy = req.user.id;
  const groupObj = {
    groupName: groupName,
    groupId: groupId,
    participants: participants,
    createdBy: createdBy,
  };
  await Groups.create(groupObj);
  res.status(200).json({ data: `${groupName} created successfully.` });
  try {
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
  console.log(req.body);
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
module.exports = {
  userLogin,
  userRegister,
  getAllusers,
  getUserById,
  createRoom,
  // messages,
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
};
