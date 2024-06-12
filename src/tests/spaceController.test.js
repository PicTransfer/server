const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken"); // Assurez-vous d'importer jwt pour générer le token
const app = require("../index");
const User = require("../models/User");
const Space = require("../models/Space");

process.env.MONGO_URI = "mongodb://your_test_mongo_uri";
process.env.JWT_SECRET = "your_jwt_secret_key";
process.env.EMAIL_USER = "your_email@example.com";
process.env.EMAIL_PASS = "your_email_password";

let server;
let userToken;

beforeAll(async () => {
  server = app.listen(5001, () => {
    console.log("Test server running on port 5001");
  });
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const user = new User({ username: "testuser", password: "password123" });
  await user.save();
  userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  server.close();
});

beforeEach(async () => {
  await User.deleteMany();
  await Space.deleteMany();
});

describe("Space Controller", () => {
  it("should create a new space", async () => {
    const res = await request(app)
      .post("/api/spaces/create")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Test Space" });
    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toBe("Test Space");
  });

  it("should add a member to a space", async () => {
    const space = new Space({
      name: "Test Space",
      owner: user._id,
      members: [user._id],
    });
    await space.save();

    const anotherUser = new User({
      username: "anotheruser",
      password: "password123",
    });
    await anotherUser.save();

    const res = await request(app)
      .post("/api/spaces/add-member")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ spaceId: space._id, userId: anotherUser._id });
    expect(res.statusCode).toEqual(200);
    expect(res.body.members).toContain(anotherUser._id.toString());
  });

  it("should upload a file to a space", async () => {
    const space = new Space({
      name: "Test Space",
      owner: user._id,
      members: [user._id],
    });
    await space.save();

    const res = await request(app)
      .post("/api/spaces/upload-file")
      .set("Authorization", `Bearer ${userToken}`)
      .field("spaceId", space._id.toString())
      .attach("file", "path/to/file.jpg");
    expect(res.statusCode).toEqual(200);
    expect(res.body.files.length).toBe(1);
  });

  it("should get files from a space", async () => {
    const space = new Space({
      name: "Test Space",
      owner: user._id,
      members: [user._id],
      files: ["file1.jpg"],
    });
    await space.save();

    const res = await request(app)
      .get(`/api/spaces/files/${space._id}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(["file1.jpg"]);
  });
});
