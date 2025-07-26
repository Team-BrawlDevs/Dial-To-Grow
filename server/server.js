// server.js (as ES module)
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on("send-offer", (data) => {
    socket.to(data.roomId).emit("receive-offer", data);
  });

  socket.on("send-answer", (data) => {
    socket.to(data.roomId).emit("receive-answer", data);
  });

  socket.on("send-ice-candidate", (data) => {
    socket.to(data.roomId).emit("receive-ice-candidate", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

server.listen(5001, () =>
  console.log("Voice Signaling Server running on port 5001")
);
