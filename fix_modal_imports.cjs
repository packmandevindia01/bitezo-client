const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filesToUpdate = execSync('dir /s /b src\\*.tsx src\\*.ts').toString().split('\r\n').filter(Boolean);

const replacements = {
  'PosCashTenderModal': 'payment/PosCashTenderModal',
  'PosMultiPayModal': 'payment/PosMultiPayModal',
  'PosDeliveryChargeModal': 'payment/PosDeliveryChargeModal',
  'PosSplitModal': 'order/PosSplitModal',
  'SplitBucketPanel': 'order/SplitBucketPanel',
  'PosSplitTableModal': 'order/PosSplitTableModal',
  'PosCombineModal': 'order/PosCombineModal',
  'PosVoidModal': 'order/PosVoidModal',
  'PosRecallModal': 'order/PosRecallModal',
  'PosRecallSearchModal': 'order/PosRecallSearchModal',
  'PosRecallDetailsModal': 'order/PosRecallDetailsModal',
  'PosExtrasModifierModal': 'product/PosExtrasModifierModal',
  'EmployeePasswordModal': 'system/EmployeePasswordModal',
  'PosMoreModal': 'system/PosMoreModal',
  'PosReportModal': 'system/PosReportModal',
  'PosSettledModal': 'system/PosSettledModal',
  'PosSettledSearchModal': 'system/PosSettledSearchModal',
  'PosSettledDetailsModal': 'system/PosSettledDetailsModal',
  'DineInTableOrdersModal': 'dining/DineInTableOrdersModal',
  'GuestCountModal': 'dining/GuestCountModal',
  'PosProviderModal': 'providers/PosProviderModal',
  'PosProviderOrderModal': 'providers/PosProviderOrderModal'
};

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  Object.keys(replacements).forEach(key => {
    const regex = new RegExp('([\'"])(.*?)modals/' + key + '([\'"])', 'g');
    if (regex.test(content)) {
      content = content.replace(regex, '$1$2modals/' + replacements[key] + '$3');
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
