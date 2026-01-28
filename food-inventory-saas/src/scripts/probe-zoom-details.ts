
import axios from 'axios';

async function probeZoomDetails() {
    const baseUrl = 'https://sandbox.zoom.red/baaszoom/public/canguroazul';

    console.log('--- Probing Zoom Details ---');

    // Try fetching details for office 136 (Valencia)
    const detailEndpoints = [
        'getDetalleOficina?codoficina=136',
        'getOficina?codoficina=136',
        'getOficinasWeb?codciudad=4&codservicio=0',
    ];

    for (const ep of detailEndpoints) {
        try {
            console.log(`Fetching ${ep}...`);
            const res = await axios.get(`${baseUrl}/${ep}`);
            if (res.data.codrespuesta === 'COD_000' || Array.isArray(res.data)) {
                console.log(`SUCCESS ${ep}!`);
                console.log(JSON.stringify(res.data, null, 2));
            } else {
                console.log(`Failed ${ep}:`, res.data.codrespuesta, res.data.mensaje);
            }
        } catch (e) { console.log(`Error ${ep}:`, e.message); }
    }
}

probeZoomDetails();
