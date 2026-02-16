
import axios from 'axios';

async function probeMrw() {
    console.log('--- Probing MRW ---');
    const urls = [
        'http://mrwve.com/',
        'http://www.mrw.com.ve/agencias',
        'http://www.mrw.com.ve/'
    ];

    for (const url of urls) {
        try {
            console.log(`Fetching ${url}...`);
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });
            console.log(`Status: ${res.status}`);
            console.log(`Content Length: ${res.data.length}`);

            const hasSelect = res.data.includes('<select');
            const hasOption = res.data.includes('<option');
            console.log(`Has Select: ${hasSelect}, Has Option: ${hasOption}`);

            // Peek at some content
            const index = res.data.indexOf('CARABOBO');
            if (index > -1) {
                console.log('Found CARABOBO at', index);
                console.log('Context:', res.data.substring(index - 50, index + 50));
            } else {
                console.log('CARABOBO not found in text');
            }

        } catch (e) {
            console.log(`Failed ${url}: ${e.message}`);
        }
    }
}

probeMrw();
