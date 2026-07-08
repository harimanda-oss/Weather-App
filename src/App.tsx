import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Droplets, Wind, Sparkles, AlertCircle, CloudRain, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { WeatherResponse } from './types';
import { getWeatherIcon, getWeatherDescription } from './utils';

export default function App() {
  const [cityInput, setCityInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!cityInput.trim()) {
      setSuggestions([]);
      return;
    }
    const fetchCities = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/cities?q=${encodeURIComponent(cityInput)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (err) {
        console.error("Failed to fetch city suggestions", err);
      }
    };
    const timer = setTimeout(fetchCities, 300);
    return () => clearTimeout(timer);
  }, [cityInput]);

  const fetchWeather = async (cityObj?: any) => {
    setLoading(true);
    setError('');
    try {
      let params = new URLSearchParams();
      if (cityObj) {
        params.append('city', cityObj.name);
        params.append('lat', cityObj.latitude.toString());
        params.append('lon', cityObj.longitude.toString());
        params.append('country', cityObj.country || '');
        params.append('admin1', cityObj.admin1 || '');
      } else {
        params.append('city', cityInput);
      }
      
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/weather?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch weather');
      }
      
      setWeatherData(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    setShowSuggestions(false);
    await fetchWeather();
  };

  const handleSelectCity = (cityObj: any) => {
    const fullName = `${cityObj.name}${cityObj.admin1 ? `, ${cityObj.admin1}` : ''}`;
    setCityInput(fullName);
    setShowSuggestions(false);
    fetchWeather(cityObj);
  };

  return (
    <div className="min-h-screen font-sans text-white p-4 sm:p-8 flex flex-col items-center relative overflow-hidden" style={{ background: 'radial-gradient(circle at 0% 0%, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}>
      {/* Mesh Gradient Overlays */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className={`w-full max-w-4xl relative z-10 transition-all duration-700 ease-in-out ${weatherData ? 'mt-8' : 'mt-[20vh]'}`}>
        
        {/* Header / Search Area */}
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight uppercase text-white mb-6 flex items-center justify-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <CloudRain className="w-7 h-7 text-indigo-300" />
            </div>
            Weather<span className="text-indigo-400 font-normal">Intelligence</span>
          </motion.h1>

          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleSearch} 
            className="relative max-w-xl mx-auto"
          >
            <div className="relative group">
              <input
                type="text"
                placeholder="Enter city name..."
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-12 pr-4 py-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg placeholder:text-white/40 text-white shadow-none"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-6 h-6 group-focus-within:text-indigo-400 transition-colors" />
              <button
                type="submit"
                disabled={loading || !cityInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-500/40 hover:bg-indigo-500/60 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed border border-white/20 text-white px-5 py-2.5 rounded-full font-medium transition-colors backdrop-blur-md"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </button>
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 w-full mt-3 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden z-50 shadow-2xl flex flex-col"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={s.id || i}
                      type="button"
                      onClick={() => handleSelectCity(s)}
                      className="w-full text-left px-5 py-4 hover:bg-white/10 transition-colors text-white border-b border-white/5 last:border-0 flex items-center gap-4"
                    >
                      <Map className="w-5 h-5 text-indigo-300 opacity-70" />
                      <div className="flex flex-col">
                        <span className="font-medium text-lg leading-tight">{s.name}</span>
                        <span className="text-sm text-white/60">
                          {s.admin1 ? `${s.admin1}, ` : ''}{s.country}
                        </span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {error && (
              <div className="mt-4 flex items-center justify-center gap-2 text-red-400 bg-red-950/30 border border-red-500/30 py-2 px-4 rounded-full text-sm font-medium backdrop-blur-md">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </motion.form>
        </div>

        {/* Dashboard Area */}
        <AnimatePresence mode="wait">
          {weatherData && (
            <motion.div
              key={weatherData.location.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              
              {/* Current Weather Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="md:col-span-1 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-8 flex flex-col justify-between shadow-none"
              >
                <div>
                  <div className="flex items-center gap-2 text-white/60 mb-6 font-medium">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {weatherData.location.name}
                      {weatherData.location.admin1 ? `, ${weatherData.location.admin1}` : ''}
                      {`, ${weatherData.location.country}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="text-[96px] leading-none font-light tracking-tighter text-white">
                      {Math.round(weatherData.current.temperature_2m)}<span className="text-3xl font-normal align-top text-white/40">°</span>
                    </div>
                    <div className="text-indigo-300">
                      {React.createElement(getWeatherIcon(weatherData.current.weather_code, weatherData.current.is_day), { size: 64, strokeWidth: 1.5 })}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10">
                  <p className="bg-indigo-500/40 inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-white/20 mb-4 text-white">
                    {getWeatherDescription(weatherData.current.weather_code)}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-white/80 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl">
                      <Wind className="w-4 h-4 text-indigo-300" />
                      <span>{weatherData.current.wind_speed_10m} km/h</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl">
                      <Droplets className="w-4 h-4 text-indigo-300" />
                      <span>{weatherData.current.relative_humidity_2m}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Forecast and AI Recommendation */}
              <div className="md:col-span-2 flex flex-col gap-6">
                
                {/* AI Recommendation Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-indigo-600/20 backdrop-blur-xl border border-indigo-500/30 rounded-[40px] p-8 text-white relative overflow-hidden shadow-none"
                >
                  <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-400 opacity-10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="flex items-start gap-6 relative z-10">
                    <div className="p-4 bg-indigo-500/30 rounded-3xl shrink-0">
                      <Sparkles className="w-8 h-8 text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-200 mb-3">Intelligence Briefing</h3>
                      <p className="text-xl leading-relaxed font-light italic text-white/90">
                        "{weatherData.recommendation}"
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* 7-Day Forecast Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 grow flex flex-col shadow-none"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-semibold tracking-tight text-white">7-Day Projection</h2>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
                    {weatherData.daily.time.map((dayTime, idx) => {
                      const Icon = getWeatherIcon(weatherData.daily.weather_code[idx]);
                      const date = parseISO(dayTime);
                      const isToday = idx === 0;

                      return (
                        <div 
                          key={dayTime} 
                          className={`min-w-[120px] snap-center flex flex-col items-center p-5 rounded-3xl border ${isToday ? 'border-indigo-400/50 bg-indigo-500/20' : 'border-white/5 bg-white/5'} transition-colors`}
                        >
                          <span className="text-sm font-medium text-white/60 mb-1">
                            {isToday ? 'Today' : format(date, 'EEE')}
                          </span>
                          <span className="text-xs text-white/40 mb-4">
                            {format(date, 'MMM d')}
                          </span>
                          <Icon className={`w-10 h-10 mb-4 ${isToday ? 'text-indigo-300' : 'text-white/80'}`} strokeWidth={1.5} />
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-white">{Math.round(weatherData.daily.temperature_2m_max[idx])}°</span>
                            <span className="text-white/40">{Math.round(weatherData.daily.temperature_2m_min[idx])}°</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
