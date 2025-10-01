const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function registerToken(email, password) {
  try {
    const salt = await bycrypt.genSalt(10);
    const hashPass = await bycrypt.hash(password, salt);

    const payload = { email, password };
    const token = jwt.sign(payload, process.env.PRIVATE_KEY);
    return { hashPass, token };
  } catch (error) {
    throw new Error("Token generation error");
  }
}

async function loginToken(password, hashPass, payload) {
  try {
    const checkPass = await bycrypt.compare(password, hashPass);
    if (!checkPass) throw new Error("Invalid email or password!!");
    const token = jwt.sign(payload, process.env.PRIVATE_KEY);
    return { token };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = { registerToken, loginToken };
