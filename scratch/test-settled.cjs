const http = require('http');

const options = {
  hostname: '192.168.1.40',
  port: 8068,
  path: '/api/settled-orders?DayId=1&OrderTypeId=0&Decimals=3',
  method: 'GET',
  headers: {
    'Accept': '*/*'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', data.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
});

req.end();
