const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

// Определяем формат аудио по имени файла для OpenRouter
function getAudioFormat(filename) {
  const name = filename.toLowerCase();
  if (name.endsWith('.mp3')) return 'mp3';
  if (name.endsWith('.wav')) return 'wav';
  if (name.endsWith('.m4a')) return 'm4a';
  if (name.endsWith('.ogg')) return 'ogg';
  if (name.endsWith('.webm')) return 'webm';
  if (name.endsWith('.flac')) return 'flac';
  return 'mp3'; // По умолчанию
}

app.post('/proxy', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('Файл не передан');

    const apiKey = req.headers['authorization'];
    if (!apiKey) return res.status(401).send('Не указан API-ключ');

    // Кодируем аудиофайл в base64
    const base64Audio = req.file.buffer.toString('base64');
    const audioFormat = getAudioFormat(req.file.originalname);

    // OpenRouter ожидает JSON с base64, а не multipart/form-data
    const payload = {
      model: req.body.model || 'openai/gpt-4o-transcribe',
      audio: {
        data: base64Audio,
        format: audioFormat
      },
      language: req.body.language || 'ru'
    };

    const response = await axios.post('https://openrouter.ai/api/v1/audio/transcriptions', payload, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
