import express from 'express';
import cors from 'cors';
import { runTrace } from './algorithmRunner.js';

const app = express();
const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || '*';

// Log effective CORS origin for diagnostics
console.log('Configured CORS origin:', corsOrigin);

// Use cors middleware and also add a defensive header middleware so
// errors or other handlers don't forget to expose the header.
app.use(cors({ origin: corsOrigin }));
app.options('*', cors({ origin: corsOrigin }));

app.use((req, res, next) => {
  // Mirror configured origin (or wildcard) in responses
  try {
    res.header('Access-Control-Allow-Origin', corsOrigin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  } catch (e) {
    // no-op; continue
  }
  // Quick response for preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/version', (_req, res) => {
  res.json({ version: '1.0.0' });
});

app.get('/api/algorithms', (_req, res) => {
  res.json({ algorithms: ['backtracking', 'memo', 'bottomup'] });
});

app.get('/api/run-stream', (req, res) => {
  const s = String(req.query.s ?? '');
  const p = String(req.query.p ?? '');
  const algorithm = String(req.query.algorithm ?? 'memo');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let clientDisconnected = false;
  req.on('close', () => {
    clientDisconnected = true;
  });

  const sendStreamPayload = (payload) => {
    if (clientDisconnected || res.writableEnded) {
      return;
    }
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      clientDisconnected = true;
    }
  };

  Promise.resolve(runTrace({
    s,
    p,
    algorithm,
    stream: true,
    onEvent: (event) => {
      sendStreamPayload({ type: 'EVENT', event });
    },
    shouldAbort: () => clientDisconnected,
  }))
    .then((trace) => {
      if (!clientDisconnected) {
        sendStreamPayload({
          type: 'SUMMARY',
          algorithm: trace.algorithm,
          input: trace.input,
          finalAnswer: trace.finalAnswer,
          metrics: trace.metrics,
        });
        sendStreamPayload({ type: 'COMPLETE' });
      }
      res.end();
    })
    .catch((error) => {
      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify({ type: 'ERROR', error: String(error) })}\n\n`);
        res.end();
      }
    });
});

app.post('/api/run', (req, res) => {
  const { s, p, algorithm = 'memo' } = req.body;
  const trace = runTrace({ s, p, algorithm });
  res.json(trace);
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
