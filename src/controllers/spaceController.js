const Space = require("../models/Space");
const User = require("../models/User");

exports.createSpace = async (req, res) => {
  try {
    const { name } = req.body;
    const space = new Space({
      name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "owner" }],
    });
    await space.save();
    res.status(201).send(space);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { spaceId, userId, role } = req.body;
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).send({ message: "Space not found" });
    }
    const owner = space.members.find(
      (member) =>
        member.user.toString() === req.user.id && member.role === "owner"
    );
    if (!owner) {
      return res
        .status(403)
        .send({ message: "Only the owner can add members" });
    }
    space.members.push({ user: userId, role: role || "member" });
    await space.save();

    // Émission de l'événement de notification via socket.io
    const io = req.app.get("socketio");
    io.emit("notification", {
      message: `User ${userId} added to space ${spaceId}`,
    });

    res.send(space);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    const { spaceId } = req.body;
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).send({ message: "Space not found" });
    }
    const member = space.members.find(
      (member) => member.user.toString() === req.user.id
    );
    if (!member) {
      return res.status(403).send({ message: "Only members can upload files" });
    }
    space.files.push(req.file.path);
    await space.save();

    // Émission de l'événement de notification via socket.io
    const io = req.app.get("socketio");
    io.emit("notification", { message: `File uploaded to space ${spaceId}` });

    res.send(space);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
};
