const data = {
  "transDate": "2026-06-18",
  "branchId": 2,
  "employeeId": 3,
  "netAmount": 0,
  "narration": "",
  "createdAt": "2026-06-18T09:46:22.801Z",
  "details": [
    {
      "productId": 3,
      "unitId": 1,
      "qty": 4,
      "price": 0,
      "amount": 0,
      "baseQty": 4,
      "typeId": 1,
      "effect": "All"
    }
  ]
};

fetch('http://84.255.173.131:8068/api/stock-adjustment', { 
  method: 'POST', 
  headers: { 
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IkFkbWluIiwiVG9rZW5UeXBlIjoiYXV0aCIsInRlbmFudElkIjoiYXBwX2RiIiwiYnJhbmNoSWQiOiIwIiwiY291bnRlcklkIjoiMCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFkbWluIiwiY2xpZW50X3R5cGUiOiJiYWNrb2ZmaWNlLWFwcCIsImV4cCI6MTc4MTc3OTAwMSwiaXNzIjoiTXlBcHAiLCJhdWQiOiJiYWNrb2ZmaWNlLWFwcCJ9.FsVJcp1sEEWAoE_lR4cUaFXP3qG8CJmthKucCfGoA6A', 
    'clientDb': 'app_db', 
    'Content-Type': 'application/json' 
  }, 
  body: JSON.stringify(data)
})
.then(async res => {
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
})
.catch(console.error);
