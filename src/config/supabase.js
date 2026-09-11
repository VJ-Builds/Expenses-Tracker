import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with actual Supabase URL and Anon Key
const supabaseUrl = 'https://mzaypyfebarcprqjcklj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16YXlweWZlYmFyY3BycWpja2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjQ3NTUsImV4cCI6MjEwMjcwMDc1NX0.Cb1Dzqw-xCQtHc39rp7UHT5l50a3jEBG4U5wgGFTxAw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
