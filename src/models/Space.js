const mongoose = require("mongoose");

const SpaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  files: [{ type: String }],
});

module.exports = mongoose.model("Space", SpaceSchema);
