const fs = require('fs');
const path = require('path');

const modalsDir = path.join(__dirname, 'src', 'features', 'pos', 'terminal', 'components', 'modals');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Fix mismatched quotes: "path/to/module' -> "path/to/module"
            content = content.replace(/"([^"]*?)'/g, '"$1"');
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    }
}

processDirectory(modalsDir);

