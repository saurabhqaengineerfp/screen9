const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearMovies() {
  const { error } = await supabase.from('movies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Error deleting movies:', error);
  } else {
    console.log('All movies deleted successfully. You can now start fresh.');
  }
}

clearMovies();
