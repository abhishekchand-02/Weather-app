import React from 'react';
import { createRoot } from 'react-dom/client';
import { Search, CloudSun, Droplets, Wind, ThermometerSun, AlertCircle, Loader2 } from 'lucide-react';
import './styles.css';

const quickCities = ['New York', 'London', 'Tokyo', 'Sydney'];

function App() {
  const [city, setCity] = React.useState('New York');
  const [weather, setWeather] = React.useState(null);
  const [status, setStatus] = React.useState('idle');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadWeather('New York');
  }, []);

  async function loadWeather(nextCity = city) {
    const trimmedCity = nextCity.trim();

    if (!trimmedCity) {
      setError('Enter a city to get the forecast.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(trimmedCity)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load weather.');
      }

      setWeather(data);
      setCity(trimmedCity);
      setStatus('success');
    } catch (requestError) {
      setError(requestError.message || 'Weather data is unavailable right now.');
      setStatus('error');
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    loadWeather();
  }

  return (
    <main className="app-shell">
      <section className="weather-panel">
        <div className="panel-header">
          <CloudSun aria-hidden="true" size={34} />
          <div>
            <p className="eyebrow">OpenWeatherMap Forecast</p>
            <h1>Weather Now</h1>
          </div>
        </div>

        <form className="search-row" onSubmit={handleSubmit}>
          <label className="search-box">
            <Search aria-hidden="true" size={20} />
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Search city"
              aria-label="City name"
            />
          </label>
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? <Loader2 className="spin" size={20} /> : <Search size={20} />}
            <span>Search</span>
          </button>
        </form>

        <div className="quick-cities" aria-label="Quick city searches">
          {quickCities.map((quickCity) => (
            <button key={quickCity} type="button" onClick={() => loadWeather(quickCity)}>
              {quickCity}
            </button>
          ))}
        </div>

        {status === 'error' && (
          <div className="notice" role="alert">
            <AlertCircle aria-hidden="true" size={20} />
            <span>{error}</span>
          </div>
        )}

        {weather && <WeatherView weather={weather} loading={status === 'loading'} />}
      </section>
    </main>
  );
}

function WeatherView({ weather, loading }) {
  return (
    <section className={`forecast-wrap ${loading ? 'is-loading' : ''}`} aria-live="polite">
      <div className="current-weather">
        <div>
          <p className="location">
            {weather.city}
            {weather.country ? `, ${weather.country}` : ''}
          </p>
          <p className="condition">{weather.current.description}</p>
          <p className="updated">
            Updated {new Date(weather.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {weather.cached ? ' from cache' : ''}
          </p>
        </div>
        <img
          src={`https://openweathermap.org/img/wn/${weather.current.icon}@4x.png`}
          alt={weather.current.description}
        />
        <strong>{weather.current.temperature}°C</strong>
      </div>

      <div className="metric-grid">
        <Metric icon={<ThermometerSun size={20} />} label="Feels like" value={`${weather.current.feelsLike}°C`} />
        <Metric icon={<Droplets size={20} />} label="Humidity" value={`${weather.current.humidity}%`} />
        <Metric icon={<Wind size={20} />} label="Wind" value={`${weather.current.windSpeed} m/s`} />
      </div>

      <div className="forecast-grid">
        {weather.forecast.map((day) => (
          <article className="forecast-day" key={day.date}>
            <p>{formatDay(day.date)}</p>
            <img src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} alt={day.description} />
            <strong>
              {day.max}° <span>{day.min}°</span>
            </strong>
            <small>{day.description}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatDay(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(`${date}T12:00:00`)
  );
}

createRoot(document.getElementById('root')).render(<App />);
