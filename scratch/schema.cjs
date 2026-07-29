const fs = require('fs');
let c = fs.readFileSync('swagger.json', 'utf16le');
if(c.charCodeAt(0)===0xFEFF) c = c.slice(1);
const s = JSON.parse(c);
console.log("SCHEMA:", JSON.stringify(s.components.schemas['PurchaseInvoiceDetailsDto'], null, 2));
