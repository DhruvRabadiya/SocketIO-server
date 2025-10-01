const User = require("../models/users");
const { loginToken, registerToken } = require("../services/getToken.service");

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
module.exports = { userLogin, userRegister };
