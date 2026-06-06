const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://100.51.1.187:3000';
const IOT_API_KEY = process.env.IOT_API_KEY || '';

exports.handler = async (event) => {
  const readings = [];

  for (const record of event.Records || []) {
    try {
      // IoT Core rule SELECT * FROM topic sends the raw MQTT payload
      let body;
      if (typeof record === 'string') {
        body = JSON.parse(record);
      } else if (record.data) {
        // base64-encoded payload from older SQL versions
        body = JSON.parse(Buffer.from(record.data, 'base64').toString('utf-8'));
      } else {
        // Direct object (newer SQL versions pass parsed JSON)
        body = record;
      }

      // Handle both direct properties and nested topic structure
      const deviceId = body.deviceId || (body.topic ? body.topic.split('/')[2] : null);
      if (!deviceId) continue;

      readings.push({
        deviceId,
        value: Number(body.value),
        unit: body.unit || '',
        quality: body.quality || 'good',
        timestamp: body.timestamp || new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to parse IoT record:', err);
    }
  }

  if (readings.length === 0) {
    console.log('No valid readings to process');
    return { statusCode: 200, body: 'OK (empty)' };
  }

  const payload = JSON.stringify({ readings });
  const url = new URL('/api/v1/readings/batch', BACKEND_URL);

  const options = {
    hostname: url.hostname,
    port: url.port || 3000,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IOT_API_KEY,
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 10000,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Backend responded: ${res.statusCode} — ${readings.length} readings`);
        resolve({ statusCode: 200, body: `Processed ${readings.length} readings` });
      });
    });

    req.on('error', (err) => {
      console.error('Backend request failed:', err);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Backend timeout'));
    });

    req.write(payload);
    req.end();
  });
};
