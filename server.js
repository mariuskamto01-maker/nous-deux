const express = require('express');
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ── PROXY CLAUDE API ─────────────────────────────────────────
app.post('/claude-proxy', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── NOTIFICATIONS FIREBASE ───────────────────────────────────
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
} catch(e) {}

if(serviceAccount && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

app.post('/notify', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;
    if(!token) return res.json({ ok: false, error: 'no token' });
    const message = { token, notification: { title, body }, data: data || {} };
    const result = await admin.messaging().send(message);
    res.json({ ok: true, result });
  } catch(e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
