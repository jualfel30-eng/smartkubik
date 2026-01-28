
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { MapPin, Search, X } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

const libraries = ['places'];
const defaultCenter = { lat: 10.1807, lng: -67.9904 }; // Valencia, VE default

const darkModeStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

export function LocationPicker({ value, onChange, label = 'Ubicación' }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    language: 'es'
  });

  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false); // Default hidden for cleaner UI

  useEffect(() => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(theme === 'dark' || (theme === 'system' && isSystemDark));
  }, [theme]);

  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(value?.coordinates || null);
  const [center, setCenter] = useState(value?.coordinates || defaultCenter);
  const [addressRaw, setAddressRaw] = useState(value?.manualAddress || '');
  const [autocomplete, setAutocomplete] = useState(null);
  const [formattedAddress, setFormattedAddress] = useState(value?.formattedAddress || '');

  // Keep internal state in sync with external value if it changes externally
  useEffect(() => {
    if (value?.coordinates) {
      setMarker(value.coordinates);
      setCenter(value.coordinates);
      setIsMapVisible(true); // Auto-show map if there is a value
    }
    if (value?.formattedAddress) {
      setFormattedAddress(value.formattedAddress);
    }
    if (value?.manualAddress) {
      setAddressRaw(value.manualAddress);
    }
  }, [value]);

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const notifyChange = (lat, lng, addr, manualAddr) => {
    const coords = { lat, lng };
    onChange({
      address: addr,
      coordinates: coords,
      formattedAddress: addr,
      manualAddress: manualAddr || addr
    });
  };

  const reverseGeocode = (lat, lng) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const addr = results[0].formatted_address;
        setFormattedAddress(addr);
        if (!addressRaw) setAddressRaw(addr); // Set manual address if empty
        notifyChange(lat, lng, addr, addressRaw || addr);
      } else {
        console.error('Geocoder failed:', status);
        // Fallback if geocode fails
        notifyChange(lat, lng, `${lat}, ${lng}`, addressRaw);
      }
    });
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const addr = place.formatted_address || place.name;

        setCenter({ lat, lng });
        setMarker({ lat, lng });
        setFormattedAddress(addr);
        setAddressRaw(addr); // Auto-fill manual address
        setIsMapVisible(true);

        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(16);
        }

        notifyChange(lat, lng, addr, addr);
      } else {
        console.log('No geometry available for place');
      }
    }
  };

  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleUseMyPosition = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCenter({ lat, lng });
          setMarker({ lat, lng });
          setIsMapVisible(true);
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(16);
          }
          reverseGeocode(lat, lng);
        },
        () => {
          alert('No se pudo obtener tu ubicación.');
        }
      );
    }
  };

  const handleManualAddressChange = (e) => {
    const val = e.target.value;
    setAddressRaw(val);
    // Determine if we should update the parent immediately or wait? 
    // Usually manual address is auxiliary, so update parent too.
    if (marker) {
      onChange({
        address: formattedAddress,
        coordinates: marker,
        formattedAddress: formattedAddress,
        manualAddress: val
      });
    }
  };

  const handleClear = () => {
    setMarker(null);
    setFormattedAddress('');
    setAddressRaw('');
    onChange(null);
  };

  if (loadError) return <div className="p-4 bg-red-50 text-red-600 rounded">Error loading Google Maps</div>;
  if (!isLoaded) return <div className="p-4 bg-slate-50 animate-pulse text-slate-400 rounded">Cargando mapa...</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMapVisible(!isMapVisible)}
          className="h-8 text-xs font-medium"
        >
          {isMapVisible ? 'Ocultar mapa' : 'Mostrar mapa'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {/* Search Bar */}
        <div className="flex gap-2 relative z-10">
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
            className="flex-1"
          >
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar dirección, lugar o coordenadas..."
                className="pl-9 bg-white dark:bg-slate-900 dark:border-slate-700"
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              />
            </div>
          </Autocomplete>
          <Button type="button" variant="outline" onClick={handleUseMyPosition} title="Usar mi ubicación">
            <MapPin className="h-4 w-4" />
          </Button>
          {marker && (
            <Button type="button" variant="ghost" onClick={handleClear} title="Limpiar">
              <X className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>

        {/* Map */}
        {isMapVisible && (
          <div className="w-full h-[300px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={15}
              onLoad={onMapLoad}
              onClick={handleMapClick}
              options={{
                streetViewControl: false,
                fullscreenControl: false,
                mapTypeControl: false,
                styles: isDark ? darkModeStyle : [],
              }}
            >
              {marker && <Marker position={marker} />}
            </GoogleMap>
          </div>
        )}

        {/* Results / Manual Entry */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded border dark:border-slate-800">
          {formattedAddress && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Detectado:</span> {formattedAddress}
            </div>
          )}
          <div>
            <Label htmlFor="manual-address" className="text-xs text-slate-600 dark:text-slate-300 mb-1 block">
              Dirección Específica (Piso, Apto, Referencias):
            </Label>
            <Input
              id="manual-address"
              value={addressRaw}
              onChange={handleManualAddressChange}
              placeholder="Ej: Casa #12, frente al parque..."
              className="bg-white dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
