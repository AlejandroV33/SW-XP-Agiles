// js/supabase.js
// Importamos Supabase desde el CDN oficial
const { createClient } = supabase;

// Reemplaza esto con tus credenciales reales de Supabase
const supabaseUrl = 'https://xvdwwpsutssgshhxnyun.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZHd3cHN1dHNzZ3NoaHhueXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTQyNzMsImV4cCI6MjA5NTEzMDI3M30.xHMyH-WdHOLdjDzDLMhyqeKsjFlsiabz_UguQ7hqGgk';

// Inicializamos el cliente global
window.supabaseClient = createClient(supabaseUrl, supabaseKey);