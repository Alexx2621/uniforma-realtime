# Uniforma Realtime

Relay Socket.IO sin estado para Uniforma. Recibe exclusivamente eventos HTTPS
firmados por el backend y los distribuye a los navegadores conectados.

## Variables

- `REALTIME_SECRET`: secreto compartido con el backend.
- `ALLOWED_ORIGINS`: orígenes web separados por coma.
- `PORT`: asignado automáticamente por Railway.

El servicio no usa base de datos, volúmenes, Prisma ni tareas programadas.
