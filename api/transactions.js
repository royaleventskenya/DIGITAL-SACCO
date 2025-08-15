const supabase = require('../../lib/supabase');  
const { requireAuth } = require('../../lib/jwt');  
  
module.exports = async (req, res) => {  
  const decoded = requireAuth(req);  
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });  
  try {  
    const { data } = await supabase.from('transactions').select('*').eq('user_id', decoded.id).order('created_at', { ascending: false }).limit(50);  
    res.json(data || []);  
  } catch (e) {  
    console.error(e);  
    res.status(500).json({ message: 'Server error' });  
  }  
};
