-- 017_user_sessions.sql — journal des connexions (demande Julien 14/11/2026).
-- Une ligne = une connexion : qui, IP, appareil, quand connecté, dernière
-- activité, quand déconnecté. Écrit uniquement par le backend (service role).
CREATE TABLE IF NOT EXISTS user_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email          text,
  ip             text,
  user_agent     text,
  logged_in_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  logged_out_at  timestamptz
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx  ON user_sessions (user_id, logged_in_at DESC);
CREATE INDEX IF NOT EXISTS user_sessions_open_idx  ON user_sessions (last_seen_at DESC) WHERE logged_out_at IS NULL;

-- Pas de policy : seul le service role (backend) lit/écrit.
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Vue lisible : statut de chaque connexion.
--   en ligne    = pas déconnecté, activité < 5 min
--   inactif     = pas déconnecté, token encore valide, mais rien depuis 5 min
--   déconnecté  = a cliqué sur « se déconnecter »
--   expiré      = token de 24h arrivé à échéance sans déconnexion
CREATE OR REPLACE VIEW connexions AS
SELECT
  s.logged_in_at,
  trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) AS nom,
  s.email,
  CASE
    WHEN s.logged_out_at IS NOT NULL                    THEN 'déconnecté'
    WHEN s.expires_at < now()                           THEN 'expiré'
    WHEN s.last_seen_at > now() - interval '5 minutes'  THEN 'en ligne'
    ELSE 'inactif'
  END AS statut,
  s.last_seen_at,
  s.logged_out_at,
  s.ip,
  s.user_agent,
  s.id AS session_id
FROM user_sessions s
LEFT JOIN users u ON u.id = s.user_id
ORDER BY s.logged_in_at DESC;

-- La vue s'exécute avec les droits de l'appelant → protégée par la RLS de la table.
ALTER VIEW connexions SET (security_invoker = on);
