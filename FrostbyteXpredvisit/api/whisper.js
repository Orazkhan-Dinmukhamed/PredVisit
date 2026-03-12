const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Audio-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'QWEN_API_KEY не настроен', text: '' });

  try {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length < 100) {
      return res.status(200).json({ error: 'Аудио слишком короткое', text: '' });
    }

    const boundary = '----WhisperBoundary' + Date.now();
    const contentType = req.headers['x-audio-type'] || 'audio/webm';
    const ext = contentType.includes('ogg') ? 'ogg' : contentType.includes('mp4') ? 'mp4' : 'webm';

    const parts = [];
    parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n'));
    parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n'));
    parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="audio.' + ext + '"\r\nContent-Type: ' + contentType + '\r\n\r\n'));
    parts.push(audioBuffer);
    parts.push(Buffer.from('\r\n--' + boundary + '--\r\n'));

    const body = Buffer.concat(parts);

    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'multipart/form-data; boundary=' + boundary
      },
      body: body
    });

    const raw = await resp.text();

    if (!resp.ok) {
      console.error('Whisper error:', resp.status, raw.substring(0, 300));
      return res.status(200).json({ error: 'Whisper: ' + resp.status, text: '' });
    }

    let data;
    try { data = JSON.parse(raw); } catch (e) {
      return res.status(200).json({ error: 'Невалидный ответ Whisper', text: '' });
    }

    return res.status(200).json({ text: data.text || '' });

  } catch (e) {
    console.error('Whisper API error:', e);
    return res.status(200).json({ error: e.message, text: '' });
  }
}

// Disable Vercel body parsing for raw audio binary
handler.config = { api: { bodyParser: false } };
module.exports = handler;