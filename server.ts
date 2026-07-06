import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAi() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route
  app.get('/api/weather', async (req, res) => {
    try {
      const city = req.query.city as string;
      if (!city) {
        res.status(400).json({ error: 'City parameter is required' });
        return;
      }

      // 1. Geocoding
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        res.status(404).json({ error: 'City not found' });
        return;
      }
      
      const location = geoData.results[0];

      // 2. Weather
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();

      // 3. Gemini Recommendation
      let recommendation = "";
      try {
        const ai = getAi();
        const prompt = `Here is the 7-day weather forecast for ${location.name}, ${location.admin1 || ''} ${location.country}.

Current: ${weatherData.current.temperature_2m}°C, Weather Code: ${weatherData.current.weather_code}
Daily Highs: ${weatherData.daily.temperature_2m_max.join(', ')}
Daily Lows: ${weatherData.daily.temperature_2m_min.join(', ')}

Provide a short, 2-sentence planning recommendation for someone living or visiting here this week based on this exact weather data. Keep it conversational and helpful. Do not mention the exact weather code numbers.`;
        
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        recommendation = aiResponse.text || "Have a great week!";
      } catch (aiError: any) {
        console.error("AI Error:", aiError);
        recommendation = "Unable to generate planning recommendation. Please ensure GEMINI_API_KEY is configured in Settings.";
      }

      // Send Response
      res.json({
        location: {
          name: location.name,
          country: location.country,
          admin1: location.admin1,
        },
        current: weatherData.current,
        daily: weatherData.daily,
        recommendation
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
