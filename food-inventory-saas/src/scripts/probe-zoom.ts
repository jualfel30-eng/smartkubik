
import axios from 'axios';

async function probeZoom() {
    const baseUrl = 'https://sandbox.zoom.red/baaszoom/public/canguroazul';

    console.log('--- Probing Zoom API ---');

    try {
        console.log('Fetching Estados...');
        const estados = await axios.get(`${baseUrl}/getEstados`);
        console.log('Estados Response:', typeof estados.data, Array.isArray(estados.data) ? estados.data.slice(0, 2) : estados.data);
    } catch (e) {
        console.error('Error fetching Estados:', e.message);
    }

    try {
        console.log('Fetching Ciudades...');
        const ciudades = await axios.get(`${baseUrl}/getCiudades`);
        console.log('Ciudades Response:', typeof ciudades.data, Array.isArray(ciudades.data) ? ciudades.data.slice(0, 2) : ciudades.data);
    } catch (e) {
        console.error('Error fetching Ciudades:', e.message);
    }

    try {
        console.log('Fetching Oficinas...');
        const oficinas = await axios.get(`${baseUrl}/getOficinas`);
        console.log('Oficinas Response:', typeof oficinas.data, Array.isArray(oficinas.data) ? oficinas.data.slice(0, 2) : oficinas.data);
    } catch (e) {
        console.error('Error fetching Oficinas:', e.message);
    }
}

probeZoom();
