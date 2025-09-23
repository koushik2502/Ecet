const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// In-memory store; replace with DB for production
const devices = {}; // deviceId -> { latest, sms: [] }

io.on('connection', socket => {
  console.log('socket connected', socket.id);
  socket.on('register', ({ deviceId }) => {
    socket.join(`device_${deviceId}`);
    console.log('socket registered for', deviceId);
  });
  socket.on('disconnect', () => {
    // cleanup if needed
  });
});

app.post('/api/update', (req, res) => {
  const { deviceId, type, payload } = req.body;
  if (!deviceId || !type || !payload) return res.status(400).json({ ok:false, message:'missing' });
  devices[deviceId] = devices[deviceId] || { latest: null, sms: [] };

  if (type === 'location') {
    devices[deviceId].latest = { ...payload, ts: Date.now() };
    io.emit('deviceLocation', { deviceId, payload: devices[deviceId].latest });
    io.to(`device_${deviceId}`).emit('location', devices[deviceId].latest);
  } else if (type === 'sms') {
    const item = { ...payload, ts: Date.now() };
    devices[deviceId].sms.unshift(item);
    io.emit('deviceSms', { deviceId, payload: item });
    io.to(`device_${deviceId}`).emit('sms', item);
  } else if (type === 'commandResult') {
    io.emit('commandResult', { deviceId, payload });
  }

  res.json({ ok: true });
});

app.get('/api/devices', (req, res) => {
  res.json({ devices: Object.keys(devices).map(id => ({ deviceId:id, latest: devices[id].latest })) });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, ()=>console.log('server listening on', PORT));
