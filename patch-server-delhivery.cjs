const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldFetch = "const response = await fetch(`https://track.delhivery.com/api/kinko/v1/invoice/charges.json?md=${mode === 'Express' ? 'E' : 'S'}&cgm=${weight}&o_pin=${pickup_pincode}&d_pin=${delivery_pincode}`, {";
const newFetch = "const response = await fetch(`https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=${mode === 'Express' ? 'E' : 'S'}&ss=Delivered&d_pin=${delivery_pincode}&o_pin=${pickup_pincode}&cgm=${weight}&pt=Pre-paid`, {";

code = code.replace(oldFetch, newFetch);

fs.writeFileSync('server.ts', code);
