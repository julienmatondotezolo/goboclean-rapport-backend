-- 012_stock_and_salary.sql — Lot 4 (Ali) : inventaire produits + compteur de paie.
-- APPLIQUÉE en prod via MCP Supabase le 30/07/2026.

-- ============================== STOCK =====================================
CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,                -- slug : anti_mousse, hydrofuge, peinture_gris_ardoise…
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'produit',  -- produit | peinture
  quantity NUMERIC NOT NULL DEFAULT 0,
  threshold NUMERIC NOT NULL DEFAULT 15,     -- seuil d'alerte (modèle ACC)
  unit TEXT NOT NULL DEFAULT 'U',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id TEXT NOT NULL REFERENCES stock_items(id),
  delta NUMERIC NOT NULL,             -- négatif = consommation, positif = réappro
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id, created_at DESC);

INSERT INTO stock_items (id, label, category) VALUES
  ('anti_mousse', 'Anti-mousse', 'produit'),
  ('hydrofuge', 'Hydrofuge', 'produit'),
  ('peinture_gris_ardoise', 'Peinture — Gris ardoise', 'peinture'),
  ('peinture_noir', 'Peinture — Noir', 'peinture'),
  ('peinture_rouge', 'Peinture — Rouge', 'peinture'),
  ('peinture_rouge_sombre', 'Peinture — Rouge sombre', 'peinture')
ON CONFLICT (id) DO NOTHING;

-- ============================== PAIE ======================================
CREATE TABLE IF NOT EXISTS work_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES users(id),
  work_date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),   -- montant/jour choisi par Ali (100-300 €)
  note TEXT,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, work_date)
);
CREATE INDEX IF NOT EXISTS idx_work_days_worker_date ON work_days(worker_id, work_date DESC);
