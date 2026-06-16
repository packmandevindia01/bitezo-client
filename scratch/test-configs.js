const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IkFkbWluIiwiVG9rZW5UeXBlIjoiYXV0aCIsInRlbmFudElkIjoiYXBwX2RiIiwiYnJhbmNoSWQiOiIyIiwiY291bnRlcklkIjoiMSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFkbWluIiwiY2xpZW50X3R5cGUiOiJwb3MtYXBwIiwiZXhwIjoxNzgxNTk5MzMxLCJpc3MiOiJNeUFwcCIsImF1ZCI6InBvcy1hcHAifQ.1E6vA9bhnuBBhjS7DjlV4NSemIruqjGkUzn_uVMC4mo";

const fetchConfigs = () => {
  const path = `/api/Branch/load-pos-master-data?seriesId=1`;
  console.log("GET path:", path);
  
  const options = {
    hostname: '84.255.173.131',
    port: 8068,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json',
      'clientDb': 'app_db',
      'terminalId': '1'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log("=== POS Master Configs ===");
        if (json.configs) {
          console.log("Configs content:", JSON.stringify(json.configs, null, 2));
        } else {
          console.log("No configs field found. Entire response:", JSON.stringify(json, null, 2));
        }
      } catch (e) {
        console.log("Failed to parse JSON:", e.message);
        console.log("Raw response:", data.substring(0, 1000));
      }
    });
  });
  req.on('error', (e) => { console.error(e); });
  req.end();
};

fetchConfigs();
