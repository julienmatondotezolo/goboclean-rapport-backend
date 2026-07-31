-- 014_client_language.sql — langue du client (nl/fr/en) sur la mission :
-- remplie par Abou depuis la langue du devis Falco ou choisie par l'admin ;
-- affichée aux ouvriers + rapport PDF, et le bon part dans cette langue.
-- APPLIQUÉE en prod via MCP Supabase le 31/07/2026.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS client_language TEXT DEFAULT 'fr';
