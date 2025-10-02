const jwt = require("jsonwebtoken");

async function authCheck(req, res, next) {
  let token = req.headers.authorization;
  if (!token) return res.status(400).send("Unauthorized, Please Login First!");
  try {
    token = token.split(" ")[1];
    const validUser = jwt.verify(token, process.env.PRIVATE_KEY);
    req.user = validUser;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
module.exports = authCheck;
