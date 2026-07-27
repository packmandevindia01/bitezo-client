import fs from 'fs';
import path from 'path';

const filesToFix = [
  "src/features/general/section/pages/SectionPage.tsx",
  "src/features/general/supplier/pages/SupplierList.tsx",
  "src/features/general/user/pages/UserList.tsx",
  "src/features/general/userRole/pages/UserRolePage.tsx",
  "src/features/inventory/branches/components/BranchTable.tsx",
  "src/features/inventory/category/components/CategoryTable.tsx",
  "src/features/inventory/extrasMaster/pages/ExtrasMasterPage.tsx",
  "src/features/inventory/extrasType/pages/ExtrasTypePage.tsx",
  "src/features/inventory/group/pages/GroupPage.tsx",
  "src/features/inventory/modifier/components/ModifierListCard.tsx",
  "src/features/inventory/modifier/pages/ModifierPage.tsx",
  "src/features/inventory/modifierType/pages/ModifierTypePage.tsx",
  "src/features/inventory/stockAdjustmentType/pages/StockAdjustmentTypePage.tsx",
  "src/features/inventory/subcategory/components/SubCategoryTable.tsx",
  "src/features/inventory/tax/pages/TaxPage.tsx",
  "src/features/inventory/unit/pages/UnitPage.tsx",
  "src/features/inventory/voucherSeries/pages/VoucherSeriesPage.tsx",
  // add any others that need unused import cleaning
];

filesToFix.forEach((relPath) => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Fix missing canAdd and onAdd in ListHeader
  if (content.includes('<ListHeader')) {
      let listHeaderBlock = content.match(/<ListHeader[^>]+>/);
      if (listHeaderBlock) {
          let blockStr = listHeaderBlock[0];
          let blockChanged = false;

          // Check if canAdd exists in the file but not in ListHeader
          if (content.includes('canAdd =') || content.includes('canAdd}')) {
              if (!blockStr.includes('canAdd=')) {
                  blockStr = blockStr.replace('/>', '  canAdd={canAdd}\n      />');
                  blockChanged = true;
              }
          }
          
          // Check if openCreateModal exists
          if (content.includes('openCreateModal')) {
              if (!blockStr.includes('onAdd=')) {
                  blockStr = blockStr.replace('/>', '  onAdd={openCreateModal}\n      />');
                  blockChanged = true;
              }
          } else if (content.includes('onAdd=')) {
              // it's a table component that receives onAdd
              // Wait, if it receives onAdd in props, it will have `onAdd` in the file.
              if (content.match(/onAdd(,|:|\})/)) {
                  if (!blockStr.includes('onAdd=')) {
                      // but wait, does it pass it?
                      if (content.includes('onAdd?: () => void') || content.includes('onAdd,') || content.includes('onAdd?:')) {
                          if (!blockStr.includes('canAdd=')) {
                             blockStr = blockStr.replace('/>', '  canAdd={!!onAdd}\n      />');
                          }
                          blockStr = blockStr.replace('/>', '  onAdd={onAdd}\n      />');
                          blockChanged = true;
                      }
                  }
              }
          }

          if (blockChanged) {
              content = content.replace(listHeaderBlock[0], blockStr);
              changed = true;
          }
      }
  }

  // 2. Clean up duplicate ListHeader imports
  if (content.includes('RecordTableCard, ListHeader,') && content.includes('ListHeader,')) {
      // Find the second ListHeader and remove it. Or just use regex to clean up
      content = content.replace(/ListHeader,\s*ListHeader,/g, 'ListHeader,');
      // more robust:
      let importLines = content.split('\n');
      for (let i = 0; i < importLines.length; i++) {
          if (importLines[i].includes('} from "../../../../components/common"')) {
              break;
          }
      }
      
      // Let's just do a string replacement for the exact duplicates we know
      content = content.replace(/ListHeader,\s*ListHeader,/g, 'ListHeader,');
      content = content.replace(/ListHeader,\r?\n\s*ListHeader,/g, 'ListHeader,');
      content = content.replace(/ListHeader,\r?\n\s*StatusBadge,\r?\n\s*ListHeader,/g, 'ListHeader,\n  StatusBadge,');
      changed = true;
  }
  
  // 3. Remove unused Plus import
  if (content.includes('Plus')) {
      if (!content.includes('<Plus')) {
          content = content.replace(/Pencil, Trash2, Plus/, 'Pencil, Trash2');
          content = content.replace(/AlertCircle, Pencil, Trash2, X, Plus/, 'AlertCircle, Pencil, Trash2, X');
          content = content.replace(/Pencil, RotateCcw, Save, Trash2, Plus/, 'Pencil, RotateCcw, Save, Trash2');
          content = content.replace(/import { Plus } from "lucide-react";\r?\n/, '');
          content = content.replace(/,\s*Plus\s*}/, '}');
          content = content.replace(/{\s*Plus\s*,/, '{');
          changed = true;
      }
  }
  
  // 4. Remove unused Button import from common
  if (content.includes('Button') && !content.includes('<Button')) {
      content = content.replace(/Button,\s*/g, '');
      content = content.replace(/,\s*Button/g, '');
      changed = true;
  }

  if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      
  }
});
