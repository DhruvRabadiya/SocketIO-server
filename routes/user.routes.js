const express = require("express");
const {
  userLogin,
  userRegister,
  getAllusers,
  getUserById,
} = require("../controllers/user.controller");
const authCheck = require("../middlewares/authCheck");
const router = express.Router();

router.post("/login", userLogin);
router.post("/register", userRegister);
router.get("/all", authCheck, getAllusers);
router.get("/:id", authCheck, getUserById);
module.exports = router;
