const fetch = require('node-fetch');  
const base64 = (s) => Buffer.from(s).toString('base64');  
  
const ENV = process.env.MPESA_ENV || 'sandbox';  
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;  
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;  
const SHORTCODE = process.env.MPESA_SHORTCODE; // e.g., 174379  
const PASSKEY = process.env.MPESA_PASSKEY; // Lipa Na MPesa Online passkey  
const CALLBACK_BASE = process.env.MPESA_CALLBACK_BASE; // e.g., https://your-app.vercel.app/api/mpesa  
  
if (!CONSUMER_KEY || !CONSUMER_SECRET || !SHORTCODE || !PASSKEY || !CALLBACK_BASE) {  
  console.warn('MPesa env vars missing. STK Push will not work until configured.');  
}  
  
const URLS = {  
  sandbox: {  
    oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',  
    stk: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'  
  },  
  production: {  
    oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',  
    stk: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'  
  }  
};  
  
async function getAccessToken(){  
  const url = URLS[ENV].oauth;  
  const token = base64(${CONSUMER_KEY}:${CONSUMER_SECRET});  
  const res = await fetch(url, { headers: { Authorization: Basic ${token} } });  
  if (!res.ok) throw new Error('Could not fetch MPesa token');  
  const data = await res.json();  
  return data.access_token;  
}  
  
function lipaTimestamp(){  
  const d = new Date();  
  const y = d.getFullYear();  
  const mo = String(d.getMonth()+1).padStart(2,'0');  
  const day = String(d.getDate()).padStart(2,'0');  
  const hr = String(d.getHours()).padStart(2,'0');  
  const min = String(d.getMinutes()).padStart(2,'0');  
  const sec = String(d.getSeconds()).padStart(2,'0');  
  return ${y}${mo}${day}${hr}${min}${sec};  
}  
  
async function stkPush({ amount, phone, accountRef, description }){  
  const accessToken = await getAccessToken();  
  const timestamp = lipaTimestamp();  
  const password = base64(${SHORTCODE}${PASSKEY}${timestamp});  
  
  const payload = {  
    BusinessShortCode: SHORTCODE,  
    Password: password,  
    Timestamp: timestamp,  
    TransactionType: 'CustomerPayBillOnline',  
    Amount: Math.round(amount),  
    PartyA: phone,  
    PartyB: Number(SHORTCODE),  
    PhoneNumber: phone,  
    CallBackURL: ${CALLBACK_BASE}/callback,  
    AccountReference: accountRef || 'SACCO',  
    TransactionDesc: description || 'Loan repayment'  
  };  
  
  const res = await fetch(URLS[ENV].stk, {  
    method: 'POST',  
    headers: {  
      Authorization: Bearer ${accessToken},  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify(payload)  
  });  
  
  const data = await res.json();  
  return data; // includes CheckoutRequestID in successful sandbox response  
}  
  
module.exports = { stkPush };
