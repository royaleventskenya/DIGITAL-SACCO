// Optional: registration endpoint. You can also seed users via migration.  
const supabase = require('../../lib/supabase');  
const { hashPassword } = require('../../lib/hash');  
const { sign } = require('../../lib/jwt');  
  
module.exports = async (req, res) => {  
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });  
  const body = req.body || JSON.parse(req.body || '{}');  
  const { name, email, password } = body;  
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });  
  
  try {  
    // check existing  
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).limit(1);  
    if (existing && existing.length) return res.status(400).json({ message: 'Email already registered' });  
  
    const hashed = await hashPassword(password);  
    const { data, error } = await supabase.from('users').insert([{ name, email, password: hashed }]).select().single();  
    if (error) throw error;  
  
    const token = sign({ id: data.id, email: data.email });  
    res.json({ user: { id: data.id, name: data.name, email: data.email }, token });  
  } catch (e) {  
    console.error(e);  
    res.status(500).json({ message: 'Server error' });  
  }  
};
