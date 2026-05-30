const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IkFkbWluIiwiVG9rZW5UeXBlIjoiYXV0aCIsInRlbmFudElkIjoiYXBwX2RiIiwiYnJhbmNoSWQiOiIyIiwiY291bnRlcklkIjoiMSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFkbWluIiwiY2xpZW50X3R5cGUiOiJwb3MtYXBwIiwiZXhwIjoxNzc5ODU5ODQyLCJpc3MiOiJMyUFwcCIsImF1ZCI6InBvcy1hcHAifQ.pzXX33xTuWEhaYCvK0sNjExQJtgVbRAVNWsDwJoUu4M';

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '84.255.173.131',
      port: 8068,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'clientDb': 'app_db'
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    const orderData = await get('/api/menu/order/order_data/7');
    console.log('ORDER DATA STATUS:', orderData.status);
    console.log('ORDER DATA BODY:', JSON.stringify(JSON.parse(orderData.body), null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
