import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL || 'https://gztxesuikyiafoqbxuhn.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dHhlc3Vpa3lpYWZvcWJ4dWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDYwOTUsImV4cCI6MjA2MzU4MjA5NX0.z-MdVauDlxvlc-FqSUlgPFXHe2ouIWvTc-AcnONO0vQ'
);
