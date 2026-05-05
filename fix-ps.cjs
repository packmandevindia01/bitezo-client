const fs = require('fs');
const f = 'src/features/general/providerSettings/components/ProviderSettingsEntryRow.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/onClick=\{onAdd\}/, 'onClick={() => { onAdd(); setTimeout(() => document.getElementById("ps-entry-product")?.focus(), 0); }}');
fs.writeFileSync(f, c);
