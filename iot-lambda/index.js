const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://100.51.1.187:3000';
const IOT_API_KEY = process.env.IOT_API_KEY || '';

exports.handler = async (event) => {
  console.log('IoT event received:', JSON.stringify(event).substring(0, 200));

  // IoT Core rule with SQL 2016-03-23 sends payload directly, not wrapped in Records
  let reading;
  try {
    if (event.deviceId) {
      // Direct MQTT payload from SELECT *
      reading = event;
    } else if (event.Records) {
      // Old format
      const record = event.Records[0];
      reading = typeof record === 'string' ? JSON.parse(record) : record;
      if (reading.data) {
        reading = JSON.parse(Buffer.from(reading.data, 'base64').toString('utf-8'));
      }
    }
  } catch (err) {
    console.error('Failed to parse IoT event:', err);
    return { statusCode: 400, body: 'Invalid payload' };
  }

  if (!reading || !reading.deviceId) {
    console.log('No valid reading in event');
    return { statusCode: 200, body: 'OK (no reading)' };
  }

  reading.value = Number(reading.value);
  reading.quality = reading.quality || 'good';
  reading.timestamp = reading.timestamp || new Date().toISOString();

  const url = new URL('/api/v1/readings/iot-ingest', BACKEND_URL);
  const payload = JSON.stringify(reading);
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
        console.log(`Backend responded: ${res.statusCode} - ${reading.deviceId} value=${reading.value}`);
        resolve({ statusCode: 200, body: 'OK' });
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
