import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://febwfnrpqcwebfffmvwl.supabase.co';
const supabaseAnonKey = 'sb_publishable_uC0TETrywiMj3Hok07imFg_v1bC3axB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);