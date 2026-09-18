const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const payload = \{\s*format: 'json',\s*data: JSON.stringify\(\{\s*pickup_location: \{ name: warehouse \},\s*shipments: \[\{\s*name,\s*add: address,\s*pin: pincode,\s*phone,\s*order: orderId,\s*payment_mode: paymentMode,\s*weight: weight \/ 1000,\s*shipping_mode: "Express"\s*\}\]\s*\}\)\s*\};/;

const newPayload = `
      const totalAmount = items ? items.reduce((sum, item) => sum + Number(item.price), 0) : 0;
      const productsDesc = items ? items.map(i => i.name).join(', ') : '';

      const payload = {
        format: 'json',
        data: JSON.stringify({
          pickup_location: { name: warehouse },
          shipments: [{
            name,
            add: address,
            pin: pincode,
            phone,
            order: orderId,
            payment_mode: paymentMode,
            weight: weight / 1000,
            shipping_mode: "Express",
            products_desc: productsDesc,
            cod_amount: paymentMode === 'COD' ? totalAmount : 0,
            total_amount: totalAmount
          }]
        })
      };
`;

code = code.replace(regex, newPayload);
fs.writeFileSync('server.ts', code);
