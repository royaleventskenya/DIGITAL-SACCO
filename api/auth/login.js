const supabase = require('../../lib/supabase');  
const { compare } = require('../../lib/hash');  
const { sign } = require('../../lib/jwt');  
  
module.exports = async (req, res) => {  
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });  
  const body = req.body || JSON.parse(req.body || '{}');  
  const { email, password } = body;  
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });  
  
  try {  
    const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1).single();  
    if (error || !data) return res.status(401).json({ message: 'Invalid credentials' });  
    const ok = await compare(password, data.password);  
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });  
  
    const token = sign({ id: data.id, email: data.email });  
    res.json({ user: { id: data.id, name: data.name, email: data.email }, token });  
  } catch (e) {  
    console.error(e);  
    res.status(500).json({ message: 'Server error' });  
  }  
};
