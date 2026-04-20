-- Seed estimated freight for KW, QA, OM based on CCFI Middle East baseline
-- Apply to Supabase SQL editor once. Values are estimates; CCFI updates will overwrite over time.
-- Source: CCFI Persian Gulf lane, approximate multipliers vs Jebel Ali baseline.
-- KW ≈ UAE+5%, QA ≈ UAE+3%, OM ≈ UAE+8% (slightly longer route)

DO $$
DECLARE
  ref_20gp numeric;
  ref_40gp numeric;
  ref_40hq numeric;
  today_date date := CURRENT_DATE;
BEGIN
  SELECT baseline_freight INTO ref_20gp
  FROM freight_rates
  WHERE route_key = 'shanghai-jebel-ali-20gp'
  ORDER BY date DESC LIMIT 1;

  SELECT baseline_freight INTO ref_40gp
  FROM freight_rates
  WHERE route_key = 'shanghai-jebel-ali-40gp'
  ORDER BY date DESC LIMIT 1;

  SELECT baseline_freight INTO ref_40hq
  FROM freight_rates
  WHERE route_key = 'shanghai-jebel-ali-40hq'
  ORDER BY date DESC LIMIT 1;

  -- Only insert if we have reference data
  IF ref_20gp IS NOT NULL THEN
    INSERT INTO freight_rates (route_key, container_type, baseline_freight, date, source)
    VALUES
      ('shanghai-shuaiba-20gp',  '20GP', round(ref_20gp  * 1.05), today_date, 'seed-estimate'),
      ('shanghai-shuaiba-40gp',  '40GP', round(ref_40gp  * 1.05), today_date, 'seed-estimate'),
      ('shanghai-shuaiba-40hq',  '40HQ', round(ref_40hq  * 1.05), today_date, 'seed-estimate'),
      ('shanghai-hamad-20gp',    '20GP', round(ref_20gp  * 1.03), today_date, 'seed-estimate'),
      ('shanghai-hamad-40gp',    '40GP', round(ref_40gp  * 1.03), today_date, 'seed-estimate'),
      ('shanghai-hamad-40hq',    '40HQ', round(ref_40hq  * 1.03), today_date, 'seed-estimate'),
      ('shanghai-sohar-20gp',    '20GP', round(ref_20gp  * 1.08), today_date, 'seed-estimate'),
      ('shanghai-sohar-40gp',    '40GP', round(ref_40gp  * 1.08), today_date, 'seed-estimate'),
      ('shanghai-sohar-40hq',    '40HQ', round(ref_40hq  * 1.08), today_date, 'seed-estimate')
    ON CONFLICT (route_key, container_type, date) DO NOTHING;
  END IF;
END $$;
