import { createHmac, timingSafeEqual } from 'node:crypto';

export const ALLOWED_EVENTS = new Set([
  'alertas:actualizadas',
  'sistema:actualizacion',
  'produccion:autorizacion-resuelta',
  'produccion:pedidos-actualizados',
]);

export function signPayload(secret, timestamp, rawBody) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

export function verifySignature({ secret, timestamp, signature, rawBody, now = Date.now() }) {
  if (!secret || !timestamp || !signature || !rawBody) return false;
  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(now - parsedTimestamp) > 30_000) {
    return false;
  }
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = Buffer.from(signPayload(secret, timestamp, rawBody), 'hex');
  const received = Buffer.from(signature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
