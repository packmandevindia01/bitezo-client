const fs = require('fs');
const path = require('path');

const modalsDir = path.join(__dirname, 'src', 'features', 'pos', 'terminal', 'components', 'modals');

const categories = {
  payment: [
    'PosCashTenderModal.tsx',
    'PosDeliveryChargeModal.tsx',
    'PosMultiPayModal.tsx'
  ],
  order: [
    'PosRecallDetailsModal.tsx',
    'PosRecallModal.tsx',
    'PosRecallSearchModal.tsx',
    'PosVoidModal.tsx',
    'PosCombineModal.tsx',
    'PosSplitModal.tsx',
    'PosSplitTableModal.tsx'
  ],
  product: [
    'PosExtrasModifierModal.tsx'
  ],
  system: [
    'EmployeePasswordModal.tsx',
    'PosMoreModal.tsx',
    'PosReportModal.tsx',
    'PosSettledDetailsModal.tsx',
    'PosSettledModal.tsx',
    'PosSettledSearchModal.tsx'
  ],
  dining: [
    'DineInTableOrdersModal.tsx',
    'GuestCountModal.tsx'
  ],
  providers: [
    'PosProviderModal.tsx',
    'PosProviderOrderModal.tsx'
  ]
};

for (const [folder, files] of Object.entries(categories)) {
  const folderPath = path.join(modalsDir, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  
  for (const file of files) {
    const srcPath = path.join(modalsDir, file);
    const destPath = path.join(folderPath, file);
    
    if (fs.existsSync(srcPath)) {
      let content = fs.readFileSync(srcPath, 'utf8');
      
      // Update relative imports going UP
      content = content.replace(/(from\s+['"])(\.\.\/[^'"]+)(['"])/g, '$1../$2$3');
      content = content.replace(/(import\s+['"])(\.\.\/[^'"]+)(['"])/g, '$1../$2$3');

      // Note: sibling imports (e.g. './SomeFile') might break if the file wasn't moved to the same subfolder.
      // But based on our structure, there are no sibling imports between modals except maybe within the same feature.

      fs.writeFileSync(destPath, content, 'utf8');
      fs.unlinkSync(srcPath);
    }
  }
}

console.log('Modals moved and imports updated successfully!');
