const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../index");
const User = require("../models/User");
const Space = require("../models/Space");

process.env.MONGO_URI = "mongodb://your_test_mongo_uri";
process.env.JWT_SECRET = "your_jwt_secret_key";
process.env.EMAIL_USER = "your_email@example.com";
process.env.EMAIL_PASS = "your_email_password";

let server;
let ownerToken;
let memberToken;

beforeAll(async () => {
  server = app.listen(5001, () => {
    console.log("Test server running on port 5001");
  });
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const owner = new User({ username: "owner", password: "password123" });
  await owner.save();
  ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const member = new User({ username: "member", password: "password123" });
  await member.save();
  memberToken = jwt.sign({ id: member._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}, 30000); // Augmenter le délai pour beforeAll

afterAll(async () => {
  await mongoose.connection.close();
  await server.close();
}, 30000); // Augmenter le délai pour afterAll

beforeEach(async () => {
  await User.deleteMany();
  await Space.deleteMany();
});

describe("Space Controller", () => {
  it("should create a new space", async () => {
    const res = await request(app)
      .post("/api/spaces/create")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Test Space" });
    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toBe("Test Space");
  });

  it("should add a member to a space", async () => {
    const space = new Space({
      name: "Test Space",
      owner: owner._id,
      members: [{ user: owner._id, role: "owner" }],
    });
    await space.save();

    const res = await request(app)
      .post("/api/spaces/add-member")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ spaceId: space._id, userId: member._id, role: "member" });
    expect(res.statusCode).toEqual(200);
    expect(res.body.members).toContainEqual(
      expect.objectContaining({ user: member._id.toString(), role: "member" })
    );
  });

  it("should not add a member to a space if not owner", async () => {
    const space = new Space({
      name: "Test Space",
      owner: owner._id,
      members: [{ user: owner._id, role: "owner" }],
    });
    await space.save();

    const res = await request(app)
      .post("/api/spaces/add-member")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ spaceId: space._id, userId: member._id, role: "member" });
    expect(res.statusCode).toEqual(403);
  });

  it("should update the role of a member in a space", async () => {
    const space = new Space({
      name: "Test Space",
      owner: owner._id,
      members: [
        { user: owner._id, role: "owner" },
        { user: member._id, role: "member" },
      ],
    });
    await space.save();

    const res = await request(app)
      .post("/api/spaces/update-role")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ spaceId: space._id, userId: member._id, role: "admin" });
    expect(res.statusCode).toEqual(200);
    const updatedSpace = await Space.findById(space._id);
    const updatedMember = updatedSpace.members.find(
      (m) => m.user.toString() === member._id.toString()
    );
    expect(updatedMember.role).toBe("admin");
  });

  it("should upload a file to a space", async () => {
    const space = new Space({
      name: "Test Space",
      owner: owner._id,
      members: [{ user: owner._id, role: "owner" }],
    });
    await space.save();

    const res = await request(app)
      .post("/api/spaces/upload-file")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("spaceId", space._id.toString())
      .attach("file", "path/to/file.jpg");
    expect(res.statusCode).toEqual(200);
    expect(res.body.files.length).toBe(1);
  });

  it("should get files from a space", async () => {
    const space = new Space({
      name: "Test Space",
      owner: owner._id,
      members: [{ user: owner._id, role: "owner" }],
      files: ["file1.jpg"],
    });
    await space.save();

    const res = await request(app)
      .get(`/api/spaces/files/${space._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(["file1.jpg"]);
  });
});
