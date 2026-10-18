// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - BACKEND SERVER ENTRYPOINT
// ============================================================================

import app from './app';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` Tele-Follow-Up Orchestrator Backend Server`);
  console.log(` Running on port: http://localhost:${PORT}`);
  console.log(` Health check:    http://localhost:${PORT}/health`);
  console.log(` API Base:        http://localhost:${PORT}/api/v1`);
  console.log(`================================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed gracefully.');
  });
});

export default server;
