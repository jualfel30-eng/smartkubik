import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useCountryPlugin } from '../country-plugins/CountryPluginContext';

// Module-level singleton: shared across all hook instances
let _rate = null;
let _lastUpdate = null;
let _loading = true;
let _error = null;
let _fetching = false;
let _rateLimited = false;
let _rateLimitTimeout = null;
const _listeners = new Set();

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

async function fetchSharedRate(endpoint, refreshInterval) {
  if (_fetching || _rateLimited) return;
  _fetching = true;
  _loading = true;
  notifyListeners();

  try {
    const response = await fetchApi(endpoint);
    _rate = response.rate;
    _lastUpdate = new Date(response.lastUpdate);
    _error = null;
  } catch (err) {
    const is429 = err?.message?.includes('429') || err?.message?.includes('Too many');
    if (is429) {
      _rateLimited = true;
      clearTimeout(_rateLimitTimeout);
      _rateLimitTimeout = setTimeout(() => { _rateLimited = false; }, 5 * 60 * 1000);
    }
    _error = 'No se pudo obtener la tasa de cambio';
  } finally {
    _fetching = false;
    _loading = false;
    notifyListeners();
  }
}

// Reset singleton when endpoint changes (e.g. country switch)
let _currentEndpoint = null;
let _intervalId = null;

function ensureInterval(endpoint, refreshInterval) {
  if (_currentEndpoint === endpoint) return;
  _currentEndpoint = endpoint;
  clearInterval(_intervalId);
  fetchSharedRate(endpoint, refreshInterval);
  _intervalId = setInterval(() => fetchSharedRate(endpoint, refreshInterval), refreshInterval || 3600000);
}

export function useExchangeRate() {
  const plugin = useCountryPlugin();
  const exchangeRateConfig = plugin.currencyEngine.getExchangeRateConfig();

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // If no exchange rate config, this country uses a single currency
    if (!exchangeRateConfig) {
      _rate = 1;
      _loading = false;
      notifyListeners();
      return;
    }

    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);

    // Start shared interval if not running or endpoint changed
    ensureInterval(exchangeRateConfig.endpoint, exchangeRateConfig.refreshIntervalMs);

    return () => {
      _listeners.delete(listener);
    };
  }, [exchangeRateConfig?.endpoint]);

  const refetch = () => {
    if (exchangeRateConfig) {
      _rateLimited = false;
      fetchSharedRate(exchangeRateConfig.endpoint, exchangeRateConfig.refreshIntervalMs);
    }
  };

  return { rate: _rate, loading: _loading, error: _error, lastUpdate: _lastUpdate, refetch };
}
