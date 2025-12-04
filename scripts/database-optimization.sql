CREATE INDEX IF NOT EXISTS idx_personal_tx_user_fecha 
ON personal_tx(user_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_personal_tx_user_tipo 
ON personal_tx(user_id, tipo);

CREATE INDEX IF NOT EXISTS idx_personal_tx_categoria 
ON personal_tx(categoria) 
WHERE categoria IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personal_tx_descripcion_fts 
ON personal_tx 
USING gin(to_tsvector('spanish', descripcion));

CREATE INDEX IF NOT EXISTS idx_personal_tx_monto 
ON personal_tx(monto);

CREATE INDEX IF NOT EXISTS idx_company_tx_empresa_fecha 
ON company_tx(empresa_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_company_tx_empresa_tipo 
ON company_tx(empresa_id, tipo);

CREATE INDEX IF NOT EXISTS idx_company_tx_categoria 
ON company_tx(categoria) 
WHERE categoria IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_tx_concepto_fts 
ON company_tx 
USING gin(to_tsvector('spanish', concepto));

CREATE INDEX IF NOT EXISTS idx_company_tx_monto 
ON company_tx(monto);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_personal_totals AS
SELECT 
  user_id,
  tipo,
  COUNT(*) as transaction_count,
  SUM(monto) as total_monto,
  AVG(monto) as avg_monto,
  MIN(fecha) as first_transaction,
  MAX(fecha) as last_transaction
FROM personal_tx
GROUP BY user_id, tipo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_personal_totals_user_tipo 
ON mv_personal_totals(user_id, tipo);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_personal_category_totals AS
SELECT 
  user_id,
  categoria,
  tipo,
  COUNT(*) as transaction_count,
  SUM(monto) as total_monto,
  AVG(monto) as avg_monto
FROM personal_tx
WHERE categoria IS NOT NULL
GROUP BY user_id, categoria, tipo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_personal_category_totals 
ON mv_personal_category_totals(user_id, categoria, tipo);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_company_totals AS
SELECT 
  empresa_id,
  tipo,
  COUNT(*) as transaction_count,
  SUM(monto) as total_monto,
  AVG(monto) as avg_monto,
  MIN(fecha) as first_transaction,
  MAX(fecha) as last_transaction
FROM company_tx
GROUP BY empresa_id, tipo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_company_totals_empresa_tipo 
ON mv_company_totals(empresa_id, tipo);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_company_category_totals AS
SELECT 
  empresa_id,
  categoria,
  tipo,
  COUNT(*) as transaction_count,
  SUM(monto) as total_monto,
  AVG(monto) as avg_monto
FROM company_tx
WHERE categoria IS NOT NULL
GROUP BY empresa_id, categoria, tipo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_company_category_totals 
ON mv_company_category_totals(empresa_id, categoria, tipo);

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_personal_totals;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_personal_category_totals;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_company_totals;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_company_category_totals;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_totals(p_user_id integer)
RETURNS TABLE(
  tipo tx_type,
  transaction_count bigint,
  total_monto numeric,
  avg_monto numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.tipo,
    COUNT(*) as transaction_count,
    SUM(pt.monto) as total_monto,
    AVG(pt.monto) as avg_monto
  FROM personal_tx pt
  WHERE pt.user_id = p_user_id
  GROUP BY pt.tipo;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_company_totals(p_empresa_id text)
RETURNS TABLE(
  tipo tx_type,
  transaction_count bigint,
  total_monto numeric,
  avg_monto numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.tipo,
    COUNT(*) as transaction_count,
    SUM(ct.monto) as total_monto,
    AVG(ct.monto) as avg_monto
  FROM company_tx ct
  WHERE ct.empresa_id = p_empresa_id
  GROUP BY ct.tipo;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION search_personal_transactions(
  p_user_id integer,
  p_search_term text
)
RETURNS SETOF personal_tx AS $$
BEGIN
  RETURN QUERY
  SELECT pt.*
  FROM personal_tx pt
  WHERE pt.user_id = p_user_id
    AND to_tsvector('spanish', pt.descripcion) @@ websearch_to_tsquery('spanish', p_search_term)
  ORDER BY pt.fecha DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION search_company_transactions(
  p_empresa_id text,
  p_search_term text
)
RETURNS SETOF company_tx AS $$
BEGIN
  RETURN QUERY
  SELECT ct.*
  FROM company_tx ct
  WHERE ct.empresa_id = p_empresa_id
    AND to_tsvector('spanish', ct.concepto) @@ websearch_to_tsquery('spanish', p_search_term)
  ORDER BY ct.fecha DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION trigger_refresh_personal_views()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('refresh_views', 'personal');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_personal_tx_changes ON personal_tx;
CREATE TRIGGER trigger_personal_tx_changes
  AFTER INSERT OR UPDATE OR DELETE ON personal_tx
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_personal_views();

CREATE OR REPLACE FUNCTION trigger_refresh_company_views()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('refresh_views', 'company');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_company_tx_changes ON company_tx;
CREATE TRIGGER trigger_company_tx_changes
  AFTER INSERT OR UPDATE OR DELETE ON company_tx
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_company_views();

ANALYZE personal_tx;
ANALYZE company_tx;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('personal_tx', 'company_tx')
ORDER BY tablename, indexname;

SELECT 
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews
WHERE matviewname LIKE 'mv_%'
ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC;
