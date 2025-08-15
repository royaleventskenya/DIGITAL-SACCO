const supabase = require('../../lib/supabase');  
const { requireAuth } = require('../../lib/jwt');  
  
module.exports = async (req, res) => {  
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });  
  const decoded = requireAuth(req);  
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });  
  
  try {  
    const body = req.body || JSON.parse(req.body || '{}');  
    const amount = Number(body.amount || 0);  
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });  
  
    // Upsert savings  
    const { error: upsertErr } = await supabase.from('savings').upsert({ user_id: decoded.id, balance: amount }, { onConflict: 'user_id' }).select();  
    // Instead of upsert with adding, we fetch current then add to it to avoid race conditions in production use DB transactions.  
  
    // Use transaction-like behavior: fetch current, then update and insert transaction  
    const { data: cur } = await supabase.from('savings').select('balance').eq('user_id', decoded.id).limit(1).single();  
    const newBalance = (cur ? Number(cur.balance) : 0) + amount;  
    await supabase.from('savings').upsert({ user_id: decoded.id, balance: newBalance }, { onConflict: 'user_id' });  
  
    await supabase.from('transactions').insert({ user_id: decoded.id, type: 'deposit', amount, created_at: new Date().toISOString() });  
  
    res.json({ success: true });  
  } catch (e) {  
    console.error(e);  
    res.status(500).json({ message: 'Server error' });  
  }  
};
