const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

code = code.replace(
  "const [isCreatingOrder, setIsCreatingOrder] = useState(false);",
  "const [isCreatingOrder, setIsCreatingOrder] = useState(false);\n  const [createdAwb, setCreatedAwb] = useState<string | null>(null);"
);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
