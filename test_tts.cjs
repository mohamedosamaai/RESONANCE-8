const https = require('https');
require('dotenv').config();
const apiKey = process.env.GOOGLE_TTS_API_KEY;
const url = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;
https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const list = JSON.parse(data).voices || [];
    const arVoices = list.filter(v => v.name.includes('ar-'));
    arVoices.forEach(v => console.log(v.name, v.ssmlGender));
  });
});
