const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

code = code.replace(
  "import { Package, Truck, FileText, Search, Plus, Trash2, CheckCircle2, History as HistoryIcon, Download, XCircle } from 'lucide-react';",
  "import { Package, Truck, FileText, Search, Plus, Trash2, CheckCircle2, History as HistoryIcon, Download, XCircle, Copy } from 'lucide-react';"
);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
