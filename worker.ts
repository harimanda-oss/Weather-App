import { GoogleGenAI } from '@google/genai';

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle /api/cities
    if (url.pathname === '/api/cities') {
      const query = url.searchParams.get('q');
      if (!query) {
        return new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } });
      }
      
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const res = await fetch(geoUrl);
        const data = await res.json();
        return new Response(JSON.stringify({ results: data.results || [] }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to fetch cities' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Handle /api/weather
    if (url.pathname === '/api/weather') {
      const city = url.searchParams.get('city');
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      const country = url.searchParams.get('country');
      const admin1 = url.searchParams.get('admin1');

      if (!city && (!lat || !lon)) {
        return new Response(JSON.stringify({ error: 'City or coordinates required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let location;
      if (lat && lon) {
        location = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          name: city || 'Unknown',
          country: country || '',
          admin1: admin1 || ''
        };
      } else {
        try {
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city as string)}&count=1&language=en&format=json`;
          const geoRes = await fetch(geoUrl);
          const geoData = await geoRes.json();
          if (!geoData.results || geoData.results.length === 0) {
            return new Response(JSON.stringify({ error: 'City not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
          }
          location = geoData.results[0];
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Failed to find city' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      }

      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        let recommendation = "";
        try {
          if (!env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set in Cloudflare secrets.");
          }
          const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
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
          recommendation = "Unable to generate planning recommendation. Please ensure GEMINI_API_KEY is configured in Cloudflare Settings.";
        }

        return new Response(JSON.stringify({
          location: {
            name: location.name,
            country: location.country,
            admin1: location.admin1,
          },
          current: weatherData.current,
          daily: weatherData.daily,
          recommendation
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to fetch weather data' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Serve index.html for all other unrecognized requests (SPA fallback behavior)
    if (env.ASSETS) {
      return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    }
    return new Response('Not Found', { status: 404 });
  },
};
