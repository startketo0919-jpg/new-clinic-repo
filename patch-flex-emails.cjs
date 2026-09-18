const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const updatedActionButtons = `
        <div style="margin-top: 30px; margin-bottom: 20px; text-align: center;">
          <a href="https://drsunilkumarbhms.in" style="background-color: #0d9488; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 10px;">Visit Clinic Website</a>
          <a href="tel:5676350536" style="background-color: #1f2937; border: 1px solid #374151; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-left: 10px;">Call Now</a>
        </div>
`;

code = code.replace(
  /<div style="margin-top: 30px; margin-bottom: 20px; display: flex; gap: 15px; justify-content: center;">\n\s*<a href="https:\/\/drsunilkumarbhms\.in"[\s\S]*?<\/a>\n\s*<a href="tel:5676350536"[\s\S]*?<\/a>\n\s*<\/div>/g,
  updatedActionButtons
);

fs.writeFileSync('server.ts', code);
