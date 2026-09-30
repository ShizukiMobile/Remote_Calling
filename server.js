const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();
const cors = require('cors');
app.use(cors({
  origin: 'https://shizukimobile.github.io'
}));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://shizukimobile.github.io', // クライアントのURLを明示
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on('call', (roomId) => {
    socket.to(roomId).emit('call');  // 自分以外の同じルームの人に通知
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

let pushSubscription = null;

app.post('/subscribe', express.json(), (req, res) => {
  pushSubscription = req.body.subscription;

  console.log('Push Subscriptionを登録しました。');

  res.status(201).json({
    message: 'Push Subscriptionを登録しました。'
  });
});

app.get('/test-push', async (req, res) => {
  if (!pushSubscription) {
    return res.status(400).send('Push Subscriptionがありません。');
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: 'リモート呼び出しシステム',
        body: 'テスト通知です。'
      })
    );

    res.send('Push通知を送信しました。');
  } catch (err) {
    console.error('Push通知の送信に失敗しました:', err);
    res.status(500).send('Push通知の送信に失敗しました。');
  }
});
