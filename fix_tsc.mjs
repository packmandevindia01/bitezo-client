import fs from 'fs';
import path from 'path';

// Parse tsc error output
const tscOutput = `
src/features/company/customer/pages/CustomerList.tsx(1,26): error TS6133: 'Plus' is declared but its value is never read.
src/features/company/customer/pages/CustomerList.tsx(8,20): error TS2300: Duplicate identifier 'ListHeader'.
src/features/company/customer/pages/CustomerList.tsx(10,3): error TS2300: Duplicate identifier 'ListHeader'.
src/features/company/customer/pages/CustomerList.tsx(11,3): error TS6133: 'Button' is declared but its value is never read.
src/features/general/counter/pages/CounterPage.tsx(2,26): error TS6133: 'Plus' is declared but its value is never read.
src/features/general/counter/pages/CounterPage.tsx(3,65): error TS6133: 'Button' is declared but its value is never read.
src/features/general/counter/pages/CounterPage.tsx(24,5): error TS6133: 'openCreateModal' is declared but its value is never read.
src/features/general/counter/pages/CounterPage.tsx(31,9): error TS6133: 'canAdd' is declared but its value is never read.
src/features/general/employee/pages/EmployeePage.tsx(1,36): error TS6133: 'SearchBar' is declared but its value is never read.
src/features/general/employee/pages/EmployeePage.tsx(1,47): error TS6133: 'Button' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(1,26): error TS6133: 'Plus' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(7,20): error TS2300: Duplicate identifier 'ListHeader'.
src/features/general/happyHour/pages/HappyHourList.tsx(8,3): error TS2300: Duplicate identifier 'ListHeader'.
src/features/general/happyHour/pages/HappyHourList.tsx(9,3): error TS6133: 'Button' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(10,3): error TS6133: 'FormInput' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(19,5): error TS6133: 'fromDate' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(19,15): error TS6133: 'setFromDate' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(19,28): error TS6133: 'toDate' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(19,36): error TS6133: 'setToDate' is declared but its value is never read.
src/features/general/happyHour/pages/HappyHourList.tsx(28,9): error TS6133: 'handleCreate' is declared but its value is never read.
src/features/general/provider/pages/ProviderListPage.tsx(3,33): error TS6133: 'Plus' is declared but its value is never read.
src/features/general/provider/pages/ProviderListPage.tsx(8,20): error TS2300: Duplicate identifier 'ListHeader'.
src/features/general/provider/pages/ProviderListPage.tsx(10,3): error TS2300: Duplicate identifier 'ListHeader'.
src/features/general/provider/pages/ProviderListPage.tsx(11,3): error TS6133: 'Button' is declared but its value is never read.
src/features/general/provider/pages/ProviderListPage.tsx(28,9): error TS6133: 'canAdd' is declared but its value is never read.
src/features/general/providerSettings/pages/ProviderSettingsList.tsx(1,26): error TS6133: 'Plus' is declared but its value is never read.
src/features/general/providerSettings/pages/ProviderSettingsList.tsx(6,20): error TS2300: Duplicate identifier 'ListHeader'.
src/features/general/providerSettings/pages/ProviderSettingsList.tsx(7,3): error TS2300: Duplicate identifier 'ListHeader'.
src/features/general/providerSettings/pages/ProviderSettingsList.tsx(8,3): error TS6133: 'Button' is declared but its value is never read.
src/features/general/providerSettings/pages/ProviderSettingsList.tsx(26,9): error TS6133: 'handleCreate' is declared but its value is never read.
src/features/inventory/branches/components/BranchTable.tsx(14,58): error TS6133: 'onAdd' is declared but its value is never read.
src/features/inventory/category/components/CategoryTable.tsx(19,3): error TS6133: 'onAdd' is declared but its value is never read.
src/features/inventory/modifier/components/ModifierListCard.tsx(18,3): error TS6133: 'onAdd' is declared but its value is never read.
src/features/inventory/subcategory/components/SubCategoryTable.tsx(19,3): error TS6133: 'onAdd' is declared but its value is never read.
`;

const fileLines = tscOutput.split('\\n');
const errorsByFile = {};

fileLines.forEach(line => {
    const match = line.match(/^([^\\(]+)\\(([^\\)]+)\\): error ([^:]+): (.*)$/);
    if (match) {
        const file = match[1];
        if (!errorsByFile[file]) {
            errorsByFile[file] = [];
        }
        errorsByFile[file].push(match[5]);
    }
});

Object.keys(errorsByFile).forEach(relPath => {
    const filePath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(filePath)) {
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Apply specific fixes based on the error messages
    const errors = errorsByFile[relPath];

    if (errors.some(e => e.includes('openCreateModal'))) {
        content = content.replace(/<ListHeader/g, '<ListHeader\\n        onAdd={openCreateModal}');
        changed = true;
    }
    if (errors.some(e => e.includes('handleCreate'))) {
        content = content.replace(/<ListHeader/g, '<ListHeader\\n        onAdd={handleCreate}');
        changed = true;
    }
    if (errors.some(e => e.includes('canAdd'))) {
        content = content.replace(/<ListHeader/g, '<ListHeader\\n        canAdd={canAdd}');
        changed = true;
    }
    if (errors.some(e => e.includes('onAdd'))) {
        content = content.replace(/<ListHeader/g, '<ListHeader\\n        canAdd={!!onAdd}\\n        onAdd={onAdd}');
        changed = true;
    }

    // Clean up duplicate ListHeader
    if (errors.some(e => e.includes("Duplicate identifier 'ListHeader'"))) {
        // Find and replace multiple ListHeader imports
        content = content.replace(/ListHeader,\\s*ListHeader,/g, 'ListHeader,');
        content = content.replace(/ListHeader,\\r?\\n\\s*ListHeader,/g, 'ListHeader,\\n');
        content = content.replace(/ListHeader,\\s*StatusBadge,\\s*ListHeader,/g, 'ListHeader,\\n  StatusBadge,');
        changed = true;
    }

    if (errors.some(e => e.includes("'Plus' is declared but its value is never read"))) {
        content = content.replace(/Pencil,\\s*Trash2,\\s*Plus/, 'Pencil, Trash2');
        content = content.replace(/AlertCircle,\\s*Pencil,\\s*Trash2,\\s*X,\\s*Plus/, 'AlertCircle, Pencil, Trash2, X');
        content = content.replace(/Pencil,\\s*RotateCcw,\\s*Save,\\s*Trash2,\\s*Plus/, 'Pencil, RotateCcw, Save, Trash2');
        content = content.replace(/import { Plus } from "lucide-react";\\r?\\n/, '');
        content = content.replace(/,\\s*Plus\\s*}/, '}');
        content = content.replace(/{\\s*Plus\\s*,/, '{');
        changed = true;
    }

    if (errors.some(e => e.includes("'Button' is declared but its value is never read"))) {
        content = content.replace(/Button,\\s*ListHeader/, 'ListHeader');
        content = content.replace(/Button,\\s*/g, '');
        content = content.replace(/,\\s*Button/g, '');
        changed = true;
    }

    if (errors.some(e => e.includes("'SearchBar' is declared but its value is never read"))) {
        content = content.replace(/SearchBar,\\s*/g, '');
        changed = true;
    }

    if (errors.some(e => e.includes("'FormInput' is declared but its value is never read"))) {
        content = content.replace(/FormInput,\\s*/g, '');
        changed = true;
    }

    // specific happyHour unused state
    if (relPath.includes('HappyHourList.tsx')) {
        content = content.replace(/const\\s*\\[fromDate,\\s*setFromDate\\]\\s*=[^;]+;/g, '');
        content = content.replace(/const\\s*\\[toDate,\\s*setToDate\\]\\s*=[^;]+;/g, '');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${relPath}`);
    }
});
