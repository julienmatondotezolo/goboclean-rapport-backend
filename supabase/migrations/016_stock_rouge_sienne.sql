-- 016_stock_rouge_sienne.sql — 5e peinture confirmée par Ali le 08/10/2026 :
-- « rouge sienne » (avec un N).
INSERT INTO stock_items (id, label, category) VALUES
  ('peinture_rouge_sienne', 'Peinture — Rouge sienne', 'peinture')
ON CONFLICT (id) DO NOTHING;
