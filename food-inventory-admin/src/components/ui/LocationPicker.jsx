import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { MapPin, Search } from 'lucide-react';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter = {
  lat: 10.1807, // Valencia, Carabobo, Venezuela
  lng: -67.9904,
};

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

// Component to update map center when changed
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Función para normalizar texto (quitar acentos y caracteres especiales)
const normalizeText = (text) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .toLowerCase();
};

export function LocationPicker({ value, onChange, label = 'Ubicación' }) {
  const [center, setCenter] = useState(value?.coordinates || defaultCenter);
  const [marker, setMarker] = useState(value?.coordinates || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [manualAddress, setManualAddress] = useState(value?.manualAddress || '');

  // Reverse geocoding usando Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FoodInventorySaaS/1.0'
          }
        }
      );
      const data = await response.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return `${lat}, ${lng}`;
    }
  };

  // Forward geocoding usando Nominatim
  const forwardGeocode = async (query) => {
    try {
      console.log('🔍 Buscando exactamente:', query);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json` +
        `&q=${encodeURIComponent(query)}` +
        `&limit=5` +
        `&addressdetails=1` +
        `&accept-language=es`,
        {
          headers: {
            'User-Agent': 'FoodInventorySaaS/1.0'
          }
        }
      );
      const data = await response.json();
      console.log('📍 Resultados encontrados:', data.length);

      if (data && data.length > 0) {
        console.log('✅ Resultados:', data);
        return data.map(result => ({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          address: result.display_name,
          type: result.type,
        }));
      }

      console.warn('❌ No se encontraron resultados para:', query);
      return [];
    } catch (error) {
      console.error('Error in forward geocoding:', error);
      return [];
    }
  };

  const handleMapClick = useCallback(async (latlng) => {
    const newLocation = {
      lat: latlng.lat,
      lng: latlng.lng,
    };
    setMarker(newLocation);
    setCenter(newLocation);

    // Get address for the location
    const address = await reverseGeocode(latlng.lat, latlng.lng);

    onChange({
      address: address,
      coordinates: newLocation,
      formattedAddress: address,
      manualAddress: manualAddress || address,
    });
  }, [onChange, manualAddress]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Verificar si es una coordenada (formato: lat, lng o lat,lng)
      const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
      const coordMatch = searchQuery.trim().match(coordPattern);

      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log('📍 Coordenadas detectadas:', lat, lng);
          const address = await reverseGeocode(lat, lng);
          selectLocation({
            lat,
            lng,
            address,
            type: 'coordinate'
          });
          setIsSearching(false);
          return;
        }
      }

      // Búsqueda normal por dirección
      const results = await forwardGeocode(searchQuery);
      if (results && results.length > 0) {
        setSearchSuggestions(results);
        // Si solo hay un resultado, seleccionarlo automáticamente
        if (results.length === 1) {
          selectLocation(results[0]);
        }
      } else {
        alert(
          '⚠️ No se encontró la dirección.\n\n' +
          '💡 Puedes buscar:\n' +
          '• Solo urbanización: "Parral", "Los Colorados"\n' +
          '• Lugar específico: "Sambil Valencia", "CC San Diego"\n' +
          '• Con calle: "Parral, Calle Rio Portuguesa"\n' +
          '• Coordenadas: "10.1807, -67.9904"'
        );
        setSearchSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Error al buscar la dirección.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (result) => {
    const newLocation = {
      lat: result.lat,
      lng: result.lng,
    };
    setCenter(newLocation);
    setMarker(newLocation);
    onChange({
      address: result.address,
      coordinates: newLocation,
      formattedAddress: result.address,
    });
    setSearchSuggestions([]);
    setSearchQuery('');
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(newLocation);
          setMarker(newLocation);

          // Get address for current location
          const address = await reverseGeocode(newLocation.lat, newLocation.lng);

          onChange({
            address: address,
            coordinates: newLocation,
            formattedAddress: address,
          });
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('No se pudo obtener la ubicación actual. Por favor, permite el acceso a tu ubicación.');
        }
      );
    } else {
      alert('Tu navegador no soporta geolocalización.');
    }
  };

  const handleClear = () => {
    setMarker(null);
    onChange(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="space-y-2">
        {/* Search box */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Ej: Parral, Calle Rio Portuguesa o pega aquí las coordenadas exactas"
                className="w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              {/* Suggestions dropdown */}
              {searchSuggestions.length > 1 && (
                <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-b-0"
                      onClick={() => selectLocation(suggestion)}
                    >
                      <div className="text-sm font-medium dark:text-white">{suggestion.address}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{suggestion.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={isSearching}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Busca flexible:</strong> Urbanización ("Parral"), Lugar ("Sambil Valencia"), con Calle ("Parral, Calle Rio Portuguesa") o coordenadas (10.1807, -67.9904)
            </p>
            <p className="text-xs text-amber-600">
              ⚠️ Evita números de casa en la búsqueda. Agrégalos después en el campo de dirección completa.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Usar ubicación actual
          </Button>
          {marker && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              Limpiar
            </Button>
          )}
        </div>

        {/* Map */}
        <div className="w-full h-[400px] rounded-lg overflow-hidden border">
          <MapContainer
            center={[defaultCenter.lat, defaultCenter.lng]}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={center} />
            <MapClickHandler onLocationSelect={handleMapClick} />
            {marker && (
              <Marker position={[marker.lat, marker.lng]} />
            )}
          </MapContainer>
        </div>

        {/* Manual address input */}
        {marker && (
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Label htmlFor="manual-address" className="text-sm font-medium">
              Dirección completa (escribe los detalles: calle, número, edificio, etc.)
            </Label>
            <Input
              id="manual-address"
              type="text"
              placeholder="Ej: Parral, Calle Rio Portuguesa, Quinta #15"
              value={manualAddress}
              onChange={(e) => {
                setManualAddress(e.target.value);
                if (marker) {
                  onChange({
                    address: value?.address || '',
                    coordinates: marker,
                    formattedAddress: value?.formattedAddress || '',
                    manualAddress: e.target.value,
                  });
                }
              }}
              className="bg-white"
            />
            <p className="text-xs text-blue-600">
              💡 Esta dirección se guardará con tus coordenadas para referencia
            </p>
          </div>
        )}

        {/* Selected address display */}
        {value?.formattedAddress && (
          <div className="p-2 bg-gray-50 rounded text-sm text-gray-700">
            <strong>Ubicación aproximada:</strong> {value.formattedAddress}
            {value?.manualAddress && value.manualAddress !== value.formattedAddress && (
              <div className="mt-1 text-blue-600">
                <strong>Dirección específica:</strong> {value.manualAddress}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}