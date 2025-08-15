const supabase = require('../../lib/supabase');  
const { requireAuth } = require('../../lib/jwt');  
  
module.exports = async (req, res) => {  
  const decoded = requireAuth(req);  
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });  
  const { checkoutRequestID } = req.query;  
  try {  
    const { data } = await supabase.from('payments').select('status').eq('checkout_request_id', checkoutRequestID).limit(1).single();  
    res.json({ status: data ? data.status : 'not_found' });  
  } catch (e) {  
    console.error(e);  
    res.status(500).json({ message: 'Server error' });  
  }  
};
