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
    res.send(space);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
};

exports.updateRole = async (req, res) => {
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
        .send({ message: "Only the owner can update roles" });
    }
    const member = space.members.find(
      (member) => member.user.toString() === userId
    );
    if (!member) {
      return res.status(404).send({ message: "Member not found" });
    }
    member.role = role;
    await space.save();
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
    res.send(space);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const space = await Space.findById(spaceId).populate("files");
    if (!space) {
      return res.status(404).send({ message: "Space not found" });
    }
    const member = space.members.find(
      (member) => member.user.toString() === req.user.id
    );
    if (!member) {
      return res.status(403).send({ message: "Only members can view files" });
    }
    res.send(space.files);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
};
