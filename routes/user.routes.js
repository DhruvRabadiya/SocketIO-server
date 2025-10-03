const express = require("express");
const {
  userLogin,
  userRegister,
  getAllusers,
  getUserById,
  getAllMessageOfRoom,
  deleteMessage,
  editMessage,
} = require("../controllers/user.controller");
const authCheck = require("../middlewares/authCheck");
const router = express.Router();

router.post("/login", userLogin);
router.post("/register", userRegister);
router.get("/all", authCheck, getAllusers);
router.get("/roomname/:name", authCheck, getAllMessageOfRoom);
router.get("/:id", authCheck, getUserById);
router.patch("/delete/:messageId", authCheck, deleteMessage);
router.patch("/edit/:messageId", authCheck, editMessage);
module.exports = router;
