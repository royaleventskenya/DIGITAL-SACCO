const { createClient } = require('@supabase/supabase-js');  
  
const SUPABASE_URL = process.env.SUPABASE_URL;  
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;  
  
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {  
  console.warn('Supabase env vars not set. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');  
}  
  
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {  
  // set appropriate fetch if running in older Node env  
});  
  
module.exports = supabase;
