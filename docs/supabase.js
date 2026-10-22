// =====================================================
// SKILLTRACK - Configuración de Supabase
// =====================================================

const SUPABASE_URL = 'https://etlmkiamppfvlcqncaca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bG1raWFtcHBmdmxjcW5jYWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDIxOTUsImV4cCI6MjEwODIxODE5NX0.3LQkKik82neCarDoTz_DcR_AySSFlR_7SLnt5xWEkfE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
