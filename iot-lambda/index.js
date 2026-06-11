const http = require('http');

exports.handler = async (event) => {
    try {
        const reading = event;
        if (!reading.deviceId) {
            console.log('Skipping - no deviceId');
            return { statusCode: 200 };
        }

        const payload = JSON.stringify(reading);
        const options = {
            hostname: '100.51.1.187',
            port: 3000,
            path: '/api/v1/readings/iot-ingest',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'iot_live_bc82ef304561ad79de104cce8f413a96',
                'Content-Length': Buffer.byteLength(payload),
            },
            timeout: 5000,
        };

        return new Promise((resolve) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    console.log(`Backend responded: ${res.statusCode}`);
                    resolve({ statusCode: 200 });
                });
            });
            req.on('error', (e) => { console.error('Backend error:', e.message); resolve({ statusCode: 200 }); });
            req.on('timeout', () => { req.destroy(); console.error('Backend timeout'); resolve({ statusCode: 200 }); });
            req.write(payload);
            req.end();
        });
    } catch (err) {
        console.error('Lambda error:', err);
        return { statusCode: 200 };
    }
};
