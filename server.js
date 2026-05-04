const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

app.post('/proxy', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('Файл не передан');
    
    const apiKey = req.headers['authorization'];
    if (!apiKey) return res.status(401).send('Не указан API-ключ');

    const form = new FormData();
    // Принудительно приводим имя файла к нижнему регистру для обхода ошибки .MP3
    form.append('file', req.file.buffer, req.file.originalname.toLowerCase());
    form.append('model', req.body.model || 'gpt-4o-transcribe');
    form.append('language', req.body.language || 'ru');
    form.append('response_format', 'json');
    form.append('temperature', '0');

    // Изменен URL отправки на сервера OpenAI
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
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
