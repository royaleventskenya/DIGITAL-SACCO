const supabase = require('../../lib/supabase');  
const { requireAuth } = require('../../lib/jwt');  
  
module.exports = async (req, res) => {  
  const decoded = requireAuth(req);  
  if (decoded) return res.status(401).json({ message: 'Unauthorized' });  
  
  if (req.method === 'GET'){  
    try {  
      const { data } = await supabase.from('loans').select('*').eq('user_id', decoded.id).order('created_at', { ascending: false }).limit(50);  
      res.json(data || []);  
    } catch(e){ console.error(e); res.status(500).json({ message: 'Server error' }); }  
    return;  
  }  
  
  if (req.method === 'POST'){  
    try {  
      const body = req.body || JSON.parse(req.body || '{}');  
      const principal = Number(body.principal || 0);  
      const term_months = Number(body.term_months || 0);  
      const purpose = String(body.purpose || '');  
      if (!principal || principal < 1000) return res.status(400).json({ message: 'Invalid principal (min 1000)' });  
      if (!term_months || term_months < 1) return res.status(400).json({ message: 'Invalid term' });  
  
      const loan = {  
        user_id: decoded.id,  
        principal,  
        term_months,  
        purpose,  
        status: 'pending',  
        outstanding: principal,  
        created_at: new Date().toISOString()  
      };  
  
      const { data, error } = await supabase.from('loans').insert([loan]).select().single();  
      if (error) throw error;  
      res.json({ loan: data });  
    } catch(e){ console.error(e); res.status(500).json({ message: 'Server error' }); }  
    return;  
  }  
  
  res.status(405).json({ message: 'Method not allowed' });  
};
