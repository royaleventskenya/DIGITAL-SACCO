const supabase = require('../../lib/supabase');  
const { requireAuth } = require('../../lib/jwt');  
  
module.exports = async (req, res) => {  
  const decoded = requireAuth(req);  
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });  
  try {  
    const { data } = await supabase.from('savings').select('balance').eq('user_id', decoded.id).limit(1).single();  
    res.json({ balance: data ? Number(data.balance) : 0 });  
  } catch (e) {  
    console.error(e);  
    res.status(500).json({ message: 'Server error' });  
  }  
};
