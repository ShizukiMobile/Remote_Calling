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

  socket.on('call', async (roomId) => {
  // 既存のSocket.IOによる呼び出し
  socket.to(roomId).emit('call');

  // Push通知の送信先が登録されているか確認
  if (
    !pushSubscription ||
    pushSubscriptionRoomId !== roomId
  ) {
    console.log(
      `ルーム ${roomId} にPush通知の送信先がありません。`
    );
    return;
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: 'リモート呼び出しシステム',
        body: '呼び出しがありました。'
      })
    );

    console.log(
      `ルーム ${roomId} にPush通知を送信しました。`
    );
  } catch (err) {
    console.error('Push通知の送信に失敗しました:', err);

    // 期限切れ・無効化されたSubscriptionへの対応
    if (err.statusCode === 404 || err.statusCode === 410) {
      pushSubscription = null;
      pushSubscriptionRoomId = null;

      console.log(
        'Push Subscriptionが無効になったため、登録を解除しました。'
      );
    }
  }
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
let pushSubscriptionRoomId = null;

app.post('/subscribe', express.json(), (req, res) => {
  const { subscription, roomId } = req.body;

  if (!subscription || !roomId) {
    return res.status(400).json({
      message: 'SubscriptionまたはルームIDがありません。'
    });
  }

  pushSubscription = subscription;
  pushSubscriptionRoomId = roomId;

  console.log(`Push Subscriptionをルーム ${roomId} に登録しました。`);

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
