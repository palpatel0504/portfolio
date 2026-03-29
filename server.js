const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const SITE_URL = process.env.SITE_URL || `http://${HOST}:${PORT}`;
const SITE_NAME = process.env.SITE_NAME || 'Pal Patel Portfolio';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      error: 'Server is missing OPENROUTER_API_KEY. Add it to your .env file and restart the server.'
    });
  }

  const { systemPrompt, messages } = req.body || {};

  if (!systemPrompt || !Array.isArray(messages)) {
    return res.status(400).json({
      error: 'Invalid request payload.'
    });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        'OpenRouter request failed.';

      return res.status(response.status).json({ error: message });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: 'OpenRouter returned an empty response.'
      });
    }

    return res.json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unexpected server error.'
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Portfolio server running on ${SITE_URL}`);
});
