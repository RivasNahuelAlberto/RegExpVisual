import express from 'express';
import cors from 'cors';
import { runTrace } from './algorithmRunner.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/version', (_req, res) => {
  res.json({ version: '1.0.0' });
});

app.get('/api/algorithms', (_req, res) => {
  res.json({ algorithms: ['backtracking', 'memo', 'bottomup'] });
});

app.post('/api/run', (req, res) => {
  const { s, p, algorithm = 'memo' } = req.body;
  const trace = runTrace({ s, p, algorithm });
  res.json(trace);
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
