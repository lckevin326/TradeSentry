-- Add structured AI fields to policies table
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS impact_level      text CHECK (impact_level IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS affected_countries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS effective_date    date,
  ADD COLUMN IF NOT EXISTS quantified_impact text,
  ADD COLUMN IF NOT EXISTS ai_tagged_at      timestamptz;
