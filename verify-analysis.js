const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/stock?symbol=RELIANCE.NS',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            if (res.statusCode !== 200) {
                console.error(`API Error: Status Code ${res.statusCode}`);
                console.error('Response:', data);
                return;
            }

            const parsedData = JSON.parse(data);
            console.log('--- Stock API Results ---');
            console.log(`Symbol: ${parsedData.symbol}`);

            if (parsedData.data && parsedData.data.length > 0) {
                console.log(`Data Points: ${parsedData.data.length}`);
                const sample = parsedData.data[parsedData.data.length - 1];
                console.log('Last Candle:', sample);

                if (sample.time && sample.close && sample.ema20) {
                    console.log('Structure verified: Time, Close, EMA20 present.');
                } else {
                    console.error('Missing required chart fields.');
                }
            } else {
                console.log('No data found for symbol.');
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
            console.log('Raw Data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
