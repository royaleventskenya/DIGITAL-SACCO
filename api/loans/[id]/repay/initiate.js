const supabase = require('../../lib/supabase');  
const { requireAuth } = require('../../lib/jwt');  
const { stkPush } = require('../../../lib/mpesa');  
  
module.exports = async (req, res) => {  
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });  
  const decoded = requireAuth(req);  
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });  
  const { id } = req.query;  
  try {  
    const body = req.body || JSON.parse(req.body || '{}');  
    const amount = Number(body.amount || 0);  
    const phone = String(body.phone || '');  
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });  
    if (!/^2547\d{8}$/.test(phone)) return res.status(400).json({ message: 'Phone must be 2547XXXXXXXX' });  
  
    const { data: loan } = await supabase.from('loans').select('*').eq('id', id).limit(1).single();  
    if (!loan) return res.status(404).json({ message: 'Loan not found' });  
    if (loan.user_id !== decoded.id) return res.status(403).json({ message: 'Forbidden' });  
  
    // Call MPesa STK Push  
    const mpesaRes = await stkPush({ amount, phone, accountRef: loan.id, description: Repay ${loan.id} });  
  
    // mpesaRes should contain CheckoutRequestID in successful response  
    const checkoutRequestID = mpesaRes.CheckoutRequestID || mpesaRes.checkoutRequestID || null;  
  
    // store payment record in DB  
    const payment = {  
      user_id: decoded.id,  
      loan_id: loan.id,  
      amount,  
      phone,  
      checkout_request_id: checkoutRequestID,  
      status: 'pending',  
      created_at: new Date().toISOString()  
    };  
    await supabase.from('payments').insert([payment]);  
  
    res.json({ checkoutRequestID, message: 'STK Push initiated. Awaiting callback.' });  
  } catch(e){ console.error('repay initiate error', e); res.status(500).json({ message: 'Server error' }); }  
};
