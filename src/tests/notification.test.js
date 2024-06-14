const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const socketIo = require("socket.io-client");
const app = require("../index");
const User = require("../models/User");
const Space = require("../models/Space");

process.env.MONGO_URI = "mongodb://localhost:27017/your_test_db"; // Utilisez une URI MongoDB valide
process.env.JWT_SECRET = "your_jwt_secret_key";
process.env.EMAIL_USER = "your_email@example.com";
process.env.EMAIL_PASS = "your_email_password";

let server;
let ownerToken;
let memberToken;
let ioClient;

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

  // Connexion au serveur Socket.IO
  ioClient = socketIo.connect("http://localhost:5001", {
    reconnectionDelay: 0,
    forceNew: true,
    transports: ["websocket"],
  });
}, 30000); // Augmenter le délai pour beforeAll

afterAll(async () => {
  await mongoose.connection.close();
  await server.close();
  ioClient.close();
}, 30000); // Augmenter le délai pour afterAll

beforeEach(async () => {
  await User.deleteMany();
  await Space.deleteMany();
});

describe("Notification Tests", () => {
  it("should notify when a member is added to a space", (done) => {
    const space = new Space({
      name: "Test Space",
      owner: owner._id,
      members: [{ user: owner._id, role: "owner" }],
    });
    space.save().then(() => {
      ioClient.once("notification", (notification) => {
        expect(notification.message).toBe(
          `User ${member._id} added to space ${space._id}`
        );
        done();
      });

      request(app)
        .post("/api/spaces/add-member")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ spaceId: space._id, userId: member._id, role: "member" })
        .then((res) => {
          expect(res.statusCode).toEqual(200);
        });
    });
  });

  it("should notify when a file is uploaded to a space", (done) => {
    const space = new Space({
      name: "Test Space",
      owner: owner._id,
      members: [{ user: owner._id, role: "owner" }],
    });
    space.save().then(() => {
      ioClient.once("notification", (notification) => {
        expect(notification.message).toBe(
          `File uploaded to space ${space._id}`
        );
        done();
      });

      request(app)
        .post("/api/spaces/upload-file")
        .set("Authorization", `Bearer ${ownerToken}`)
        .field("spaceId", space._id.toString())
        .attach("file", "path/to/file.jpg")
        .then((res) => {
          expect(res.statusCode).toEqual(200);
        });
    });
  });
});
