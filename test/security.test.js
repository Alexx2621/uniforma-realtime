import test from 'node:test';
import assert from 'node:assert/strict';
import { signPayload, verifySignature } from '../src/security.js';

test('acepta una firma vigente', () => {
  const now = 1_700_000_000_000;
  const body = JSON.stringify({ event: 'alertas:actualizadas' });
  const signature = signPayload('secreto', `${now}`, body);
  assert.equal(
    verifySignature({
      secret: 'secreto',
      timestamp: `${now}`,
      signature,
      rawBody: body,
      now,
    }),
    true,
  );
});

test('rechaza firmas alteradas o vencidas', () => {
  const now = 1_700_000_000_000;
  const body = '{}';
  const signature = signPayload('secreto', `${now}`, body);
  assert.equal(
    verifySignature({ secret: 'secreto', timestamp: `${now}`, signature, rawBody: '{"x":1}', now }),
    false,
  );
  assert.equal(
    verifySignature({ secret: 'secreto', timestamp: `${now - 31_000}`, signature, rawBody: body, now }),
    false,
  );
});
