-- Seed tariff data for UAE and SA (GCC unified external tariff = 5% for HS 4011 tires)
-- These were missing because MacMap returned null during the initial scrape.
-- GCC countries apply a common external tariff; source: macmap.org manual lookup.

INSERT INTO tariffs (hs_code, country, rate_pct, prev_rate_pct, changed, source_url)
SELECT hs_code, country, 5.0, NULL, false, source_url
FROM (VALUES
  ('401110', 'UAE', 'https://www.macmap.org/en/query/results?reporter=784&partner=156&product=401110&indicator=1'),
  ('401120', 'UAE', 'https://www.macmap.org/en/query/results?reporter=784&partner=156&product=401120&indicator=1'),
  ('401140', 'UAE', 'https://www.macmap.org/en/query/results?reporter=784&partner=156&product=401140&indicator=1'),
  ('401150', 'UAE', 'https://www.macmap.org/en/query/results?reporter=784&partner=156&product=401150&indicator=1'),
  ('401170', 'UAE', 'https://www.macmap.org/en/query/results?reporter=784&partner=156&product=401170&indicator=1'),
  ('401180', 'UAE', 'https://www.macmap.org/en/query/results?reporter=784&partner=156&product=401180&indicator=1'),
  ('401110', 'SA',  'https://www.macmap.org/en/query/results?reporter=682&partner=156&product=401110&indicator=1'),
  ('401120', 'SA',  'https://www.macmap.org/en/query/results?reporter=682&partner=156&product=401120&indicator=1'),
  ('401140', 'SA',  'https://www.macmap.org/en/query/results?reporter=682&partner=156&product=401140&indicator=1'),
  ('401150', 'SA',  'https://www.macmap.org/en/query/results?reporter=682&partner=156&product=401150&indicator=1'),
  ('401170', 'SA',  'https://www.macmap.org/en/query/results?reporter=682&partner=156&product=401170&indicator=1'),
  ('401180', 'SA',  'https://www.macmap.org/en/query/results?reporter=682&partner=156&product=401180&indicator=1')
) AS v(hs_code, country, source_url)
WHERE NOT EXISTS (
  SELECT 1 FROM tariffs t
  WHERE t.hs_code = v.hs_code AND t.country = v.country
);
