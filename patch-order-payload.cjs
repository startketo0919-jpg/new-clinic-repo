const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /shipments: \[\{\s*name,\s*add: address,\s*pin: pincode,\s*phone,\s*order: orderId,\s*payment_mode: paymentMode,\s*weight: weight \/ 1000,\s*shipping_mode: "Express",\s*products_desc: productsDesc,\s*cod_amount: paymentMode === 'COD' \? totalAmount : 0,\s*total_amount: totalAmount\s*\}\]/;

const replacement = `shipments: [{
            name,
            add: address,
            pin: pincode,
            phone,
            order: String(orderId),
            payment_mode: paymentMode,
            weight: weight,
            length: length,
            width: width,
            height: height,
            shipping_mode: "Express",
            products_desc: productsDesc,
            cod_amount: paymentMode === 'COD' ? totalAmount : 0,
            total_amount: totalAmount
          }]`;

code = code.replace(regex, replacement);

const regexDbInsert = /await db\.insert\(delhiveryOrders\)\.values\(\{([\s\S]*?)id: orderId,\s*orderId,([\s\S]*?)\}\);/;
const replacementDbInsert = `await db.insert(delhiveryOrders).values({$1id: String(orderId),\n           orderId: String(orderId),$2});`;
code = code.replace(regexDbInsert, replacementDbInsert);

fs.writeFileSync('server.ts', code);
