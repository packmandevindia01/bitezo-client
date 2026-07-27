const fs = require('fs');
const path = require('path');

const modalsDir = path.join(__dirname, 'src', 'features', 'pos', 'terminal', 'components', 'modals');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        // Only process subdirectories (where the modals were moved)
        if (stat.isDirectory() && file !== 'cart') {
            const subFiles = fs.readdirSync(fullPath);
            for (const subFile of subFiles) {
                if (subFile.endsWith('.tsx') || subFile.endsWith('.ts')) {
                    const filePath = path.join(fullPath, subFile);
                    let content = fs.readFileSync(filePath, 'utf8');
                    
                    // The files moved one directory deeper. 
                    // So we must prepend '../' to relative imports that point outside the modals folder.
                    
                    // Replace '../../../../../components/common' with '../../../../../../components/common'
                    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/components\/common/g, '"../../../../../../components/common');
                    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/\.\.\/components\/common/g, '"../../../../../components/common'); // just in case it was 4
                    
                    // Replace '../../../types' with '../../../../types'
                    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/types/g, '"../../../../types');
                    
                    // Replace '../../../cashier/services/cashierLogService' with '../../../../cashier/services/cashierLogService'
                    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/cashier/g, '"../../../../cashier');
                    
                    // Replace '../../../utils/endReportTemplate' with '../../../../utils/endReportTemplate'
                    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/utils/g, '"../../../../utils');
                    
                    // Replace '../../../services/' with '../../../../services/'
                    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/services/g, '"../../../../services');
                    
                    // Replace '../../store/posSlice' with '../../../store/posSlice'
                    content = content.replace(/['"]\.\.\/\.\.\/store/g, '"../../../store');
                    
                    // Replace '../../hooks/usePosProducts' with '../../../hooks/usePosProducts'
                    content = content.replace(/['"]\.\.\/\.\.\/hooks/g, '"../../../hooks');

                    fs.writeFileSync(filePath, content, 'utf8');
                }
            }
        }
    }
}

processDirectory(modalsDir);

