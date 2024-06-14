const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
});

const SpaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [MemberSchema],
  files: [{ type: String }],
});

module.exports = mongoose.model("Space", SpaceSchema);
