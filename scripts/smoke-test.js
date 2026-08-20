import { createHmac, randomUUID } from 'node:crypto';
import { io } from 'socket.io-client';

const url = `${process.env.REALTIME_URL || ''}`.replace(/\/$/, '');
const secret = `${process.env.REALTIME_SECRET || ''}`;
if (!url || !secret) throw new Error('Faltan REALTIME_URL o REALTIME_SECRET');

const socket = io(url, {
  transports: ['websocket'],
  upgrade: false,
  timeout: 8_000,
});

const timeout = setTimeout(() => {
  socket.close();
  throw new Error('El relay no entrego el evento de prueba');
}, 12_000);

socket.on('alertas:actualizadas', (payload) => {
  if (payload?.smokeTest !== true) return;
  clearTimeout(timeout);
  socket.close();
  console.log('Socket.IO entrego correctamente el evento firmado');
});

socket.on('connect', async () => {
  const body = JSON.stringify({
    event: 'alertas:actualizadas',
    payload: { smokeTest: true },
    messageId: randomUUID(),
  });
  const timestamp = `${Date.now()}`;
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  const response = await fetch(`${url}/emit`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-realtime-timestamp': timestamp,
      'x-realtime-signature': signature,
    },
    body,
  });
  if (!response.ok) throw new Error(`El relay respondio HTTP ${response.status}`);
});
