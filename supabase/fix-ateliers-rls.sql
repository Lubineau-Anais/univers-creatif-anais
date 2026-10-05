-- ── Correction de la politique UPDATE trop permissive sur ateliers ────────
-- La politique existante permettait à n'importe quel utilisateur authentifié
-- de modifier les ateliers. Elle doit être restreinte aux admins uniquement.

-- Supprime la politique permissive existante (adapter le nom si différent)
DROP POLICY IF EXISTS "ateliers_update_authenticated" ON ateliers;
DROP POLICY IF EXISTS "Allow authenticated update" ON ateliers;
DROP POLICY IF EXISTS "authenticated can update" ON ateliers;

-- Nouvelle politique : UPDATE uniquement pour les admins
CREATE POLICY "ateliers_update_admin_only"
  ON ateliers FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- Idem pour INSERT et DELETE si ces politiques sont trop permissives
DROP POLICY IF EXISTS "ateliers_insert_authenticated" ON ateliers;
DROP POLICY IF EXISTS "Allow authenticated insert" ON ateliers;

CREATE POLICY "ateliers_insert_admin_only"
  ON ateliers FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

DROP POLICY IF EXISTS "ateliers_delete_authenticated" ON ateliers;
DROP POLICY IF EXISTS "Allow authenticated delete" ON ateliers;

CREATE POLICY "ateliers_delete_admin_only"
  ON ateliers FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- La lecture reste publique (ateliers visibles par tous)
-- (conserver la politique SELECT existante)
