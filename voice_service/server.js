require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ── Routes (stubs — filled in VC-5) ───────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice_service' });
});

// ── MongoDB ────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('[voice_service] MongoDB connected'))
  .catch((err) => console.error('[voice_service] MongoDB error:', err));

// ── Socket.io connection (stub — filled in VC-7) ──────────
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

// ── Start server ───────────────────────────────────────────
const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`[voice_service] Running on port ${PORT}`);
});