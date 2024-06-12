const jwt = require("jsonwebtoken");
const config = require("../config/config");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  if (!token) {
    return res
      .status(401)
      .send({ message: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      throw new Error();
    }
    next();
  } catch (ex) {
    res.status(401).send({ message: "Invalid token." });
  }
};
