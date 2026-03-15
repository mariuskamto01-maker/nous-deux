const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Clé de service Firebase (injectée via variable d'environnement sur Render)
const SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const PROJECT_ID = 'nous-deux-fb69a';
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// Obtenir un token OAuth2 pour FCM v1
async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// Route principale — envoyer une notification
app.post('/notify', async (req, res) => {
  const { token, title, body, data } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'token, title, body requis' });
  }

  try {
    const accessToken = await getAccessToken();

    const message = {
      message: {
        token,
        notification: { title, body },
        data: data || {},
        webpush: {
          notification: {
            title,
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
          },
          fcm_options: {
            link: 'https://chic-shortbread-0efcc9.netlify.app'
          }
        }
      }
    };

    const response = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('FCM error:', result);
      return res.status(500).json({ error: result });
    }

    res.json({ success: true, result });
  } catch (e) {
    console.error('Server error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'nous-deux-notif' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur notifications démarré sur port ${PORT}`));
