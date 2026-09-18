const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// I will inject the helper function below updateTemplates
const helperFn = `
  const triggerTemplateEvent = (eventName: string, data: any) => {
    const activeTemplate = state.templates?.find(t => t.triggerEvent === eventName && t.isActive);
    if (!activeTemplate) return;

    let varKeys = [];
    try {
      varKeys = JSON.parse(activeTemplate.variables);
    } catch(e) {}

    const components = varKeys.length > 0 ? [{
      type: "body",
      parameters: varKeys.map((k: string) => {
        let val = '';
        if (k === 'Name') val = data.fullName || '';
        if (k === 'Patient ID') val = data.clinicId || '';
        if (k === 'Token Number') val = data.token || '';
        if (k === 'Age') val = (data.age || '').toString();
        if (k === 'Date') val = data.dateStr || '';
        if (k === 'Wait Time') val = (data.waitElapsed || '').toString();
        return { type: "text", text: val };
      })
    }] : [];

    const fallbackText = \`[Auto-Message for \${eventName}]\`;
    
    sendWhatsAppMessage(
      data.phone,
      fallbackText,
      activeTemplate.name,
      activeTemplate.languageCode,
      components
    );
  };
`;

if (!code.includes('triggerTemplateEvent')) {
  code = code.replace(/const updateSettings =/, helperFn + '\\n  const updateSettings =');
  fs.writeFileSync('src/context/ClinicContext.tsx', code);
}
