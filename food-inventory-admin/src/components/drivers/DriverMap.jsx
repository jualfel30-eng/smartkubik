
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useTheme } from '../ThemeProvider';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 10.1807, // Valencia
    lng: -67.9904
};

const libraries = ['places'];

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

export const DriverMap = ({ origin, destination, className }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries,
        language: 'es'
    });

    const { theme } = useTheme();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(theme === 'dark' || (theme === 'system' && isSystemDark));
    }, [theme]);

    const [map, setMap] = useState(null);
    const [directionsResponse, setDirectionsResponse] = useState(null);

    // Helper to parse coordinate input which could be { lat, lng } or "lat,lng" string
    const parseCoord = (coord) => {
        if (!coord) return null;
        if (typeof coord === 'object' && coord.lat && coord.lng) return coord;
        // Attempt string parse logic if needed later
        return null;
    };

    const originPos = useMemo(() => parseCoord(origin), [origin]);
    const destPos = useMemo(() => parseCoord(destination), [destination]);

    const onLoad = useCallback((map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback((map) => {
        setMap(null);
    }, []);

    // Calculate directions when map and both points are ready
    // This is a basic implementation; optimization would move this to a useEffect
    // that runs only when origin/dest changes to avoid excessive API calls.
    React.useEffect(() => {
        if (isLoaded && originPos && destPos && window.google) {
            const directionsService = new window.google.maps.DirectionsService();

            directionsService.route(
                {
                    origin: originPos,
                    // If destPos is null (e.g. it was a string address), use the raw destination string
                    destination: destPos || destination,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        setDirectionsResponse(result);
                    } else {
                        console.error(`Directions request failed: ${status}`);
                    }
                }
            );
        }
    }, [isLoaded, originPos, destPos]);

    if (!isLoaded) return <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Cargando mapa...</div>;

    return (
        <div className={className || "w-full h-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800"}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={originPos || defaultCenter}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    styles: isDark ? darkModeStyle : [],
                }}
            >
                {/* Origin Marker (Store) */}
                {originPos && <Marker position={originPos} label="A" />}

                {/* Destination Marker (Customer) */}
                {destPos && <Marker position={destPos} label="B" />}

                {/* Route Line */}
                {directionsResponse && (
                    <DirectionsRenderer directions={directionsResponse} />
                )}
            </GoogleMap>
        </div>
    );
};
