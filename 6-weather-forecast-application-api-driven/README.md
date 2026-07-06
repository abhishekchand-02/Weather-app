# Weather Forecast Application

API-driven weather app using React, Node.js, Express, and OpenWeatherMap.

## Features

- React frontend with dynamic weather updates
- Express backend proxy so the OpenWeatherMap key never reaches the browser
- Async/await API integration
- Environment-based configuration
- Friendly fallback and error states
- In-memory response caching for faster repeated searches

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env` from the sample:

   ```bash
   cp .env.example .env
   ```

3. Add your OpenWeatherMap API key to `.env`.

4. Run both frontend and backend:

   ```bash
   pnpm run dev
   ```

5. Open the Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.

## API

`GET /api/weather?city=London`

Returns current weather plus a 5-day forecast summary from OpenWeatherMap.
