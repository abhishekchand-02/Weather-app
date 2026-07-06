import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT) || 3001;
const apiKey = process.env.OPENWEATHER_API_KEY;
const baseUrl = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org';
const cacheTtlMs = (Number(process.env.CACHE_TTL_SECONDS) || 300) * 1000;
const weatherCache = new Map();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.get('/api/weather', async (request, response) => {
  const city = String(request.query.city || '').trim();

  if (!city) {
    return response.status(400).json({ message: 'Please enter a city name.' });
  }

  if (!apiKey) {
    return response.status(500).json({
      message: 'Weather service is not configured. Add OPENWEATHER_API_KEY to your .env file.'
    });
  }

  const cacheKey = city.toLowerCase();
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < cacheTtlMs) {
    return response.json({ ...cached.payload, cached: true });
  }

  try {
    const [currentResponse, forecastResponse] = await Promise.all([
      fetchWeather('/data/2.5/weather', { q: city, units: 'metric' }),
      fetchWeather('/data/2.5/forecast', { q: city, units: 'metric' })
    ]);

    const payload = {
      city: currentResponse.name,
      country: currentResponse.sys?.country,
      updatedAt: new Date().toISOString(),
      cached: false,
      current: {
        temperature: Math.round(currentResponse.main.temp),
        feelsLike: Math.round(currentResponse.main.feels_like),
        humidity: currentResponse.main.humidity,
        windSpeed: Number(currentResponse.wind.speed.toFixed(1)),
        description: titleCase(currentResponse.weather?.[0]?.description || 'Clear'),
        icon: currentResponse.weather?.[0]?.icon || '01d'
      },
      forecast: summarizeForecast(forecastResponse.list || [])
    };

    weatherCache.set(cacheKey, { createdAt: Date.now(), payload });
    response.json(payload);
  } catch (error) {
    const status = error.status || 500;
    response.status(status).json({
      message: error.publicMessage || 'Weather data is unavailable right now. Please try again soon.'
    });
  }
});

async function fetchWeather(path, params) {
  const url = new URL(path, baseUrl);
  Object.entries({ ...params, appid: apiKey }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const weatherResponse = await fetch(url);
  const body = await weatherResponse.json().catch(() => ({}));

  if (!weatherResponse.ok) {
    const error = new Error(body.message || 'OpenWeatherMap request failed');
    error.status = weatherResponse.status === 404 ? 404 : 502;
    error.publicMessage =
      weatherResponse.status === 404
        ? 'City not found. Check the spelling and try again.'
        : 'Weather provider returned an error. Please try again later.';
    throw error;
  }

  return body;
}

function summarizeForecast(items) {
  const daily = new Map();

  for (const item of items) {
    const date = item.dt_txt?.slice(0, 10);
    if (!date) continue;

    const existing = daily.get(date) || {
      date,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      descriptions: new Map(),
      icon: item.weather?.[0]?.icon || '01d'
    };

    existing.min = Math.min(existing.min, item.main.temp_min);
    existing.max = Math.max(existing.max, item.main.temp_max);

    const description = item.weather?.[0]?.description || 'Clear';
    existing.descriptions.set(description, (existing.descriptions.get(description) || 0) + 1);

    const hour = item.dt_txt.slice(11, 13);
    if (hour === '12') {
      existing.icon = item.weather?.[0]?.icon || existing.icon;
    }

    daily.set(date, existing);
  }

  return Array.from(daily.values())
    .slice(0, 5)
    .map((day) => ({
      date: day.date,
      min: Math.round(day.min),
      max: Math.round(day.max),
      description: titleCase(mostFrequent(day.descriptions)),
      icon: day.icon
    }));
}

function mostFrequent(counts) {
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Clear';
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

app.listen(port, () => {
  console.log(`Weather proxy running on http://127.0.0.1:${port}`);
});
