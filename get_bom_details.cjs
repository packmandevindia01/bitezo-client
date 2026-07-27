const http = require('http');

http.get('http://84.255.173.131:8068/api/bom/details?BranchId=2&Decimals=3', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    
  });
});
