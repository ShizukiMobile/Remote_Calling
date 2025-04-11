const { Server } = require("socket.io");
const io = new Server({
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  socket.on("join", (room) => {
    socket.join(room);
  });

  socket.on("call", (room) => {
    socket.to(room).emit("incoming-call");
  });
});

io.listen(10000); // Renderではポート10000を使うとよい