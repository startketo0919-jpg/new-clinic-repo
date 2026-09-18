const url = 'https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=110053&o_pin=&cgm=10&pt=Pre-paid';

const response = await fetch(url, {
  headers: {
    'Authorization': 'Token 03886dbe8c2792230609111e7c6aebf49e91c57b',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
console.log(data);
