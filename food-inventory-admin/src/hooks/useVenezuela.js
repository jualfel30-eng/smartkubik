
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export function useVenezuela() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get(`${API_URL}/locations`);
        setLocations(response.data);
        const statesData = response.data.map(state => ({
          name: state.name,
          iso: state.name, // Using name as a temporary unique key
        }));
        setStates(statesData);
      } catch (e) {
        console.error("Error fetching locations:", e);
        if (e.response) {
          setError(`API Error: ${e.response.data?.message || e.response.statusText}`);
        } else if (e.request) {
          setError("Network Error: No response received from server.");
        } else {
          setError(`Request Error: ${e.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const getCitiesByState = (stateName) => {
    if (!stateName) {
      setCities([]);
      return;
    }
    const selectedState = locations.find(s => s.name === stateName);
    const citiesData = selectedState ? selectedState.cities : [];
    setCities(citiesData);
  };

  return { states, cities, loading, error, getCitiesByState };
}
