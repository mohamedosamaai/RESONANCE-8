import fs from "fs";

async function run() {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    console.log("No API key");
    return;
  }
  const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`);
  const data = await res.json();
  console.log("Data:", data);
  if (!data.voices) return;
  const arVoices = data.voices.filter((v: any) => v.languageCodes.some((l: string) => l.startsWith('ar')));
  console.log(JSON.stringify(arVoices.map((v: any) => v.name), null, 2));
}
run();
