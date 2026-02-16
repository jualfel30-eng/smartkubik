
import axios from 'axios';

async function probeZoomOffices() {
    const baseUrl = 'https://sandbox.zoom.red/baaszoom/public/canguroazul';

    console.log('--- Probing Zoom Offices ---');

    const endpoints = [
        'getOficinas',
        'getOficinas?codciudad=4', // Valencia
        'getOficinas?codestado=23', // Carabobo
        'getOficinasWeb',
        'getAliados',
    ];

    for (const ep of endpoints) {
        try {
            console.log(`Fetching ${ep}...`);
            const res = await axios.get(`${baseUrl}/${ep}`);
            console.log(`${ep} Response:`, typeof res.data, Array.isArray(res.data) ? res.data.length : res.data);
            if (Array.isArray(res.data) && res.data.length > 0) {
                console.log('Sample:', res.data[0]);
            } else if (res.data?.entidadRespuesta) {
                console.log('Sample:', res.data.entidadRespuesta[0]);
            }
        } catch (e) {
            console.log(`${ep} Failed: ${e.response?.status || e.message}`);
        }
    }
}

probeZoomOffices();
