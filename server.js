const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());

// Устанавливаем лимит оперативной памяти на загрузку (30МБ)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

app.post('/proxy', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('Файл не передан');
    
    const apiKey = req.headers['authorization'];
    if (!apiKey) return res.status(401).send('Не указан API-ключ');

    // Формируем внутренний запрос к Groq API
    const form = new FormData();
    form.append('file', req.file.buffer, req.file.originalname);
    form.append('model', req.body.model || 'whisper-large-v3');
    form.append('language', req.body.language || 'ru');
    form.append('response_format', 'json');
    form.append('temperature', '0');

    // Отправляем на боевой сервер Groq
    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': apiKey
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
