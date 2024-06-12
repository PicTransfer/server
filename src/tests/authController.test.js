const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../index");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

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
  await server.close();
});

beforeEach(async () => {
  await User.deleteMany();
});

describe("Auth Controller", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "testuser",
      password: "password123",
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toBe("User registered successfully");

    const user = await User.findOne({ username: "testuser" });
    const isMatch = await bcrypt.compare("password123", user.password);
    expect(isMatch).toBe(true);
  });

  it("should not register a user with an existing username", async () => {
    await request(app).post("/api/auth/register").send({
      username: "testuser",
      password: "password123",
    });
    const res = await request(app).post("/api/auth/register").send({
      username: "testuser",
      password: "password123",
    });
    expect(res.statusCode).toEqual(400);
  });

  it("should login an existing user", async () => {
    await request(app).post("/api/auth/register").send({
      username: "testuser",
      password: "password123",
    });
    const res = await request(app).post("/api/auth/login").send({
      username: "testuser",
      password: "password123",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should not login a non-existing user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "nonexistinguser",
      password: "password123",
    });
    expect(res.statusCode).toEqual(401);
  });

  it("should request password reset", async () => {
    await request(app).post("/api/auth/register").send({
      username: "testuser",
      password: "password123",
    });
    const res = await request(app)
      .post("/api/auth/request-password-reset")
      .send({
        username: "testuser",
      });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe("Recovery email sent");
  });

  it("should reset the password", async () => {
    await request(app).post("/api/auth/register").send({
      username: "testuser",
      password: "password123",
    });

    const user = await User.findOne({ username: "testuser" });
    user.resetPasswordToken = "testtoken";
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const res = await request(app).post("/api/auth/reset-password").send({
      token: "testtoken",
      password: "newpassword123",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe("Password has been reset");

    const updatedUser = await User.findOne({ username: "testuser" });
    const isMatch = await bcrypt.compare(
      "newpassword123",
      updatedUser.password
    );
    expect(isMatch).toBe(true);
  });

  it("should not reset the password with an invalid token", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      token: "invalidtoken",
      password: "newpassword123",
    });
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toBe(
      "Password reset token is invalid or has expired."
    );
  });
});
