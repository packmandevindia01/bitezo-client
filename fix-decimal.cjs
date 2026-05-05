const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // --- For Hooks ---
  if (filePath.includes('hooks/')) {
    if (!content.includes('useCurrency')) {
      content = content.replace(
        'import { useToast } from "../../../../app/providers/useToast";',
        'import { useToast } from "../../../../app/providers/useToast";\nimport { useCurrency } from "../../../../hooks/useCurrency";'
      );
    }
    if (!content.includes('const { decimalPart, formatAmount }')) {
      content = content.replace(
        'const { showToast } = useToast();',
        'const { showToast } = useToast();\n  const { decimalPart, formatAmount } = useCurrency();'
      );
    }
  }

  // --- For Grid components ---
  if (filePath.includes('Grid')) {
    if (!content.includes('useCurrency')) {
      content = content.replace(
        'import React from "react";',
        'import React from "react";\nimport { useCurrency } from "../../../../hooks/useCurrency";'
      );
      content = content.replace(
        'import { Trash2, Edit2 } from "lucide-react";',
        'import { Trash2, Edit2 } from "lucide-react";\nimport { useCurrency } from "../../../../hooks/useCurrency";'
      );
    }
    if (!content.includes('const { decimalPart } = useCurrency();')) {
      content = content.replace(
        /const (\w+)Grid = \([^\)]+\) => \{/,
        match => `${match}\n  const { decimalPart } = useCurrency();`
      );
    }
  }

  // --- For EntryRow components ---
  if (filePath.includes('EntryRow')) {
    if (!content.includes('useCurrency')) {
      content = content.replace(
        'import React, { useMemo, useRef } from "react";',
        'import React, { useMemo, useRef } from "react";\nimport { useCurrency } from "../../../../hooks/useCurrency";'
      );
      content = content.replace(
        'import React from "react";',
        'import React from "react";\nimport { useCurrency } from "../../../../hooks/useCurrency";'
      );
    }
    if (!content.includes('const { formatAmount } = useCurrency();')) {
      content = content.replace(
        /const (\w+)EntryRow = \([^\)]+\) => \{/,
        match => `${match}\n  const { formatAmount } = useCurrency();`
      );
    }
  }

  // Replace string literals
  if (filePath.includes('hooks/')) {
    content = content.replace(/"0\.000"/g, 'formatAmount(0)');
  } else {
    // In components it's used as placeholder
    content = content.replace(/"0\.000"/g, 'formatAmount(0)');
  }

  // Replace toFixed(3)
  content = content.replace(/\.toFixed\(3\)/g, '.toFixed(decimalPart)');

  fs.writeFileSync(filePath, content);
}

const files = [
  'src/features/general/happyHour/hooks/useHappyHourForm.ts',
  'src/features/general/providerSettings/hooks/useProviderSettingsForm.ts',
  'src/features/general/happyHour/components/HappyHourEntryRow.tsx',
  'src/features/general/happyHour/components/HappyHourGrid.tsx',
  'src/features/general/providerSettings/components/ProviderSettingsEntryRow.tsx',
  'src/features/general/providerSettings/components/ProviderSettingsGrid.tsx',
];

files.forEach(processFile);
