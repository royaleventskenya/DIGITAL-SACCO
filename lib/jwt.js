const jwt = require('jsonwebtoken');  
const SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';  
  
function sign(payload){  
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });  
}  
  
function verify(token){  
  try { return jwt.verify(token, SECRET); } catch(e){ return null; }  
}  
  
function requireAuth(req){  
  const auth = req.headers.authorization || '';  
  if (!auth.startsWith('Bearer ')) return null;  
  const token = auth.replace(/^Bearer\s+/, '');  
  const decoded = verify(token);  
  return decoded;  
}  
  
module.exports = { sign, verify, requireAuth };
