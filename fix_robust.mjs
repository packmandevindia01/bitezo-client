import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (fullPath.endsWith('.tsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const allFiles = walkDir(path.join(process.cwd(), 'src/features'));

allFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Remove unused Plus
    if (content.includes('Plus') && !content.includes('<Plus') && !content.includes('Plus } from "lucide-react"')) {
        // if Plus is not used in JSX
        if (!content.match(/<Plus/)) {
            content = content.replace(/Pencil,\s*Trash2,\s*Plus/, 'Pencil, Trash2');
            content = content.replace(/AlertCircle,\s*Pencil,\s*Trash2,\s*X,\s*Plus/, 'AlertCircle, Pencil, Trash2, X');
            content = content.replace(/Pencil,\s*RotateCcw,\s*Save,\s*Trash2,\s*Plus/, 'Pencil, RotateCcw, Save, Trash2');
            content = content.replace(/import { Plus } from "lucide-react";\r?\n/, '');
            content = content.replace(/,\s*Plus\s*}/, '}');
            content = content.replace(/{\s*Plus\s*,/, '{');
            changed = true;
        }
    }

    // Remove unused Button from common
    if (content.includes('Button') && !content.includes('<Button')) {
        content = content.replace(/Button,\s*ListHeader/, 'ListHeader');
        content = content.replace(/Button,\s*/, '');
        content = content.replace(/,\s*Button/, '');
        changed = true;
    }

    // Fix duplicate ListHeader
    if (content.match(/ListHeader.*ListHeader/s)) {
        content = content.replace(/ListHeader,\s*ListHeader,/g, 'ListHeader,');
        content = content.replace(/ListHeader,\r?\n\s*ListHeader,/g, 'ListHeader,\n');
        content = content.replace(/ListHeader,\r?\n\s*StatusBadge,\r?\n\s*ListHeader,/g, 'ListHeader,\n  StatusBadge,');
        changed = true;
    }

    // Remove unused SearchBar
    if (content.includes('SearchBar') && !content.includes('<SearchBar')) {
        content = content.replace(/SearchBar,\s*/g, '');
        changed = true;
    }

    // Add missing canAdd / onAdd to ListHeader
    if (content.includes('<ListHeader')) {
        let headerMatch = content.match(/<ListHeader[^>]*\/>/);
        if (headerMatch) {
            let headerStr = headerMatch[0];
            let headerChanged = false;
            
            if (content.includes('canAdd') && !headerStr.includes('canAdd')) {
                headerStr = headerStr.replace(/\/>$/, '  canAdd={canAdd}\n      />');
                headerChanged = true;
            }
            if (content.includes('openCreateModal') && !headerStr.includes('onAdd')) {
                headerStr = headerStr.replace(/\/>$/, '  onAdd={openCreateModal}\n      />');
                headerChanged = true;
            } else if (content.includes('handleCreate') && !headerStr.includes('onAdd')) {
                headerStr = headerStr.replace(/\/>$/, '  onAdd={handleCreate}\n      />');
                headerChanged = true;
            } else if (content.match(/onAdd(\}|:|,)/) && !headerStr.includes('onAdd={onAdd}')) {
                if (!headerStr.includes('canAdd')) {
                    headerStr = headerStr.replace(/\/>$/, '  canAdd={!!onAdd}\n      />');
                }
                headerStr = headerStr.replace(/\/>$/, '  onAdd={onAdd}\n      />');
                headerChanged = true;
            }

            if (headerChanged) {
                content = content.replace(headerMatch[0], headerStr);
                changed = true;
            }
        }
    }

    // specific happyHour unused state
    if (filePath.includes('HappyHourList.tsx')) {
        if (content.includes('const [fromDate, setFromDate]')) {
            content = content.replace(/const\s*\[fromDate,\s*setFromDate\]\s*=[^;]+;/g, '');
            content = content.replace(/const\s*\[toDate,\s*setToDate\]\s*=[^;]+;/g, '');
            content = content.replace(/FormInput,\s*/, '');
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${filePath}`);
    }
});
