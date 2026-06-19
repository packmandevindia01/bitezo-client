const http = require('http');

http.get('http://84.255.173.131:8068/swagger/v1/swagger.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const swagger = JSON.parse(data);
    const bomPaths = Object.keys(swagger.paths).filter(p => p.toLowerCase().includes('bom'));
    console.log("BOM PATHS:");
    bomPaths.forEach(p => {
      console.log(p);
      console.log(Object.keys(swagger.paths[p]));
    });
  });
});
