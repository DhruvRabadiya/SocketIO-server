const express = require("express");
const {
  userLogin,
  userRegister,
  getAllusers,
  getUserById,
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
  markConversationAsRead,
  uploadFile,
} = require("../controllers/user.controller");

const authCheck = require("../middlewares/authCheck");
const validate = require("../middlewares/validation");
const {
  loginSchema,
  registerSchema,
} = require("../validations/userSchema.validations");
const upload = require("../middlewares/upload");
const router = express.Router();

router.post("/login", validate(loginSchema), userLogin);
router.post("/register", validate(registerSchema), userRegister);
router.post("/upload", authCheck, upload.array("files", 10), uploadFile);
router.get("/all", authCheck, getAllusers);
router.get("/groups", authCheck, getGroups);
router.post("/creategroup", authCheck, createGroup);
router.post("/messages", authCheck, sendMessage);

router.get("/roomname/:name", authCheck, getAllMessageOfRoom);
router.get("/group/messages/:groupId", authCheck, getAllGroupMessage);
router.get("/group/details/:groupId", authCheck, getGroupById);
router.patch("/group/add/:groupId", authCheck, addUserInGroupChat);
router.post("/mark-as-read", authCheck, markConversationAsRead);
router.get("/:id", authCheck, getUserById);
router.patch("/groupName/:groupId", authCheck, editGroupName);
router.patch("/groups/:groupId/leave", authCheck, leaveGroup);
router.patch("/delete/:messageId", authCheck, deleteMessage);
router.patch("/edit/:messageId", authCheck, editMessage);
router.post("/save-fcm-token", authCheck, saveFcmToken);
router.post("/remove-fcm-token", authCheck, removeFcmToken);
module.exports = router;
