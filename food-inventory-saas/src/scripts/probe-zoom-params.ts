
import axios from 'axios';

async function probeZoomParams() {
    const baseUrl = 'https://sandbox.zoom.red/baaszoom/public/canguroazul';

    console.log('--- Probing Zoom Params ---');

    // Try fetching services list first
    try {
        const res = await axios.get(`${baseUrl}/getServicios`);
        console.log('getServicios:', res.data);
    } catch (e) { console.log('getServicios failed'); }

    // Brute force codservicio
    const services = [0, 1, 2, 10, 15, 20];

    for (const s of services) {
        try {
            const url = `${baseUrl}/getOficinas?codciudad=4&codservicio=${s}`;
            console.log(`Trying codservicio=${s} ...`);
            const res = await axios.get(url);

            if (res.data.codrespuesta === 'COD_000') {
                console.log(`SUCCESS with codservicio=${s}!`);
                console.log('Sample:', res.data.entidadRespuesta[0]);
                break;
            } else {
                console.log(`Failed: ${res.data.codrespuesta} - ${res.data.mensaje}`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

probeZoomParams();
