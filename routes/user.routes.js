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
} = require("../controllers/user.controller");
const authCheck = require("../middlewares/authCheck");
const router = express.Router();

router.post("/login", userLogin);
router.post("/register", userRegister);
router.get("/all", authCheck, getAllusers);
router.get("/groups", authCheck, getGroups);
router.post("/creategroup", authCheck, createGroup);
router.post("/messages", authCheck, sendMessage);
router.get("/roomname/:name", authCheck, getAllMessageOfRoom);
router.get("/group/messages/:groupId", authCheck, getAllGroupMessage);
router.get("/group/details/:groupId", authCheck, getGroupById);
router.get("/:id", authCheck, getUserById);
router.patch("/delete/:messageId", authCheck, deleteMessage);
router.patch("/edit/:messageId", authCheck, editMessage);
module.exports = router;
