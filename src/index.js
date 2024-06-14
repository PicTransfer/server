const express = require("express");
const mongoose = require("mongoose");
const http = require("http"); // Ajout pour créer un serveur HTTP
const socketIo = require("socket.io"); // Import de socket.io
const config = require("./config/config");
const authRoutes = require("./routes/authRoutes");
const spaceRoutes = require("./routes/spaceRoutes");

const app = express();
const server = http.createServer(app); // Création du serveur HTTP
const io = socketIo(server); // Initialisation de socket.io

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/spaces", spaceRoutes);

mongoose
  .connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Écoute des connexions socket.io
io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.set("socketio", io); // Ajout de socket.io à l'application Express

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

module.exports = app;
