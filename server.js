const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

function getAudioFormat(filename) {
  const name = filename.toLowerCase();
  if (name.endsWith('.mp3')) return 'mp3';
  if (name.endsWith('.wav')) return 'wav';
  if (name.endsWith('.m4a')) return 'm4a';
  if (name.endsWith('.ogg')) return 'ogg';
  if (name.endsWith('.webm')) return 'webm';
  if (name.endsWith('.flac')) return 'flac';
  return 'mp3';
}

app.post('/proxy', upload.single('file'), async (req, res) => {
  try {
    console.log('--- НОВЫЙ ЗАПРОС ---');

    if (!req.file) {
      console.log('ОШИБКА: Файл не передан');
      return res.status(400).send('Файл не передан');
    }
    console.log('Файл получен:', req.file.originalname, '| Размер:', req.file.size, 'байт');

    const apiKey = req.headers['authorization'];
    if (!apiKey) {
      console.log('ОШИБКА: Нет ключа');
      return res.status(401).send('Не указан API-ключ');
    }
    console.log('Ключ есть. Начало:', apiKey.substring(0, 17));

    const base64Audio = req.file.buffer.toString('base64');
    const audioFormat = getAudioFormat(req.file.originalname);
    console.log('Формат:', audioFormat, '| base64 длина:', base64Audio.length);

    // ИСПРАВЛЕНО: поле называется input_audio (а не audio)
    const payload = {
      model: req.body.model || 'openai/gpt-4o-transcribe',
      input_audio: {
        data: base64Audio,
        format: audioFormat
      },
      language: req.body.language || 'ru'
    };
    console.log('Модель:', payload.model, '| Отправка на OpenRouter...');

    const response = await axios.post('https://openrouter.ai/api/v1/audio/transcriptions', payload, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('УСПЕХ! Ответ:', JSON.stringify(response.data).substring(0, 200));
    res.json(response.data);

  } catch (error) {
    console.log('!!! ОШИБКА ОТ OPENROUTER !!!');
    console.log('HTTP статус:', error.response?.status);
    console.log('Тело ответа:', JSON.stringify(error.response?.data));
    console.log('Сообщение:', error.message);

    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
