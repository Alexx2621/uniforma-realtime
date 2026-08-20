import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { ALLOWED_EVENTS, verifySignature } from './security.js';

const port = Number(process.env.PORT || 3000);
const secret = `${process.env.REALTIME_SECRET || ''}`.trim();
const allowedOrigins = new Set(
  `${process.env.ALLOWED_ORIGINS || 'https://app.uniformaguatemala.com,http://localhost:3000,http://localhost:3001'}`
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean),
);

if (!secret) {
  console.error('REALTIME_SECRET no esta configurado');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  express.json({
    limit: '64kb',
    verify: (request, _response, buffer) => {
      request.rawBody = buffer.toString('utf8');
    },
  }),
);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ['websocket'],
  allowUpgrades: false,
  maxHttpBufferSize: 64 * 1024,
  cors: {
    credentials: false,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no autorizado'));
    },
  },
});

const processedMessages = new Map();
const rememberMessage = (messageId) => {
  const now = Date.now();
  for (const [id, expiresAt] of processedMessages) {
    if (expiresAt <= now) processedMessages.delete(id);
  }
  if (!messageId || processedMessages.has(messageId)) return false;
  processedMessages.set(messageId, now + 60_000);
  return true;
};

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'uniforma-realtime',
    connections: io.engine.clientsCount,
    uptime: Math.round(process.uptime()),
  });
});

app.post('/emit', (request, response) => {
  const timestamp = `${request.header('x-realtime-timestamp') || ''}`;
  const signature = `${request.header('x-realtime-signature') || ''}`;
  const rawBody = `${request.rawBody || ''}`;

  if (!verifySignature({ secret, timestamp, signature, rawBody })) {
    response.status(401).json({ ok: false, error: 'Firma invalida' });
    return;
  }

  const { event, payload, messageId } = request.body || {};
  if (!ALLOWED_EVENTS.has(event)) {
    response.status(422).json({ ok: false, error: 'Evento no permitido' });
    return;
  }
  if (!rememberMessage(messageId)) {
    response.status(202).json({ ok: true, duplicate: true });
    return;
  }

  io.emit(event, payload || {});
  response.status(202).json({ ok: true, deliveredTo: io.engine.clientsCount });
});

io.on('connection', (socket) => {
  socket.onAny(() => {
    // Los navegadores solo reciben eventos; nunca publican en el relay.
  });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Uniforma realtime escuchando en ${port}`);
});

const shutdown = (signal) => {
  console.log(`Cierre solicitado por ${signal}`);
  io.close(() => httpServer.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 5_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
