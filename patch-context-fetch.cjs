const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

if (!code.includes('updateTemplates')) {
  // Add templates to default state
  code = code.replace(
    /messages: \[\],/,
    `messages: [],
    templates: [],`
  );

  // Add updateTemplates function
  const fn = `
  const updateTemplates = async (templates: WhatsAppTemplate[]) => {
    setState(prev => ({ ...prev, templates }));
    await fetch('/api/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })
    });
  };
`;
  code = code.replace(/const updateSettings =/, fn + '\n  const updateSettings =');
  
  // Add to ContextType
  code = code.replace(
    /updateSettings: \(settings: Partial<ClinicState\['settings'\]>\) => void;/,
    `updateSettings: (settings: Partial<ClinicState['settings']>) => void;
  updateTemplates: (templates: WhatsAppTemplate[]) => Promise<void>;`
  );
  
  // Export in context provider
  code = code.replace(
    /updateSettings,\s*resetDatabase/,
    `updateSettings,
    updateTemplates,
    resetDatabase`
  );

  fs.writeFileSync('src/context/ClinicContext.tsx', code);
}
