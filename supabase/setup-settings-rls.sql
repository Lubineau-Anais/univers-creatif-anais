-- ── RLS sur la table settings ──────────────────────────────────────────────
-- La table settings stocke des clés sensibles (Stripe, Google, etc.)
-- Elle doit être protégée : lecture publique sur les clés non-sensibles,
-- écriture réservée aux admins authentifiés.

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié peut lire les settings publics
-- (les clés sensibles comme stripe_secret_key sont lues côté Edge Function
--  via service_role, jamais exposées au client)
CREATE POLICY "settings_select_authenticated"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

-- Lecture publique pour les settings non-sensibles accessibles en anon
-- (ex: textes du site, couleurs, etc.)
CREATE POLICY "settings_select_anon"
  ON settings FOR SELECT
  TO anon
  USING (
    key NOT IN (
      'stripe_secret_key',
      'stripe_webhook_secret',
      'google_api_key',
      'google_place_id'
    )
  );

-- Écriture : réservée aux admins (rôle service_role depuis les Edge Functions,
-- ou utilisateurs authentifiés avec is_admin = true dans app_metadata)
CREATE POLICY "settings_write_admin"
  ON settings FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );
