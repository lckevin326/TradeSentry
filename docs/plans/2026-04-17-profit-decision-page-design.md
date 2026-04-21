# Profit Decision Page Design

**Context**

The current project already has a working monitoring MVP:

- exchange rate ingestion and display
- tariff ingestion and display
- partial policy ingestion and alerts

What it does not yet do is convert those external changes into an order-level profit decision. The next iteration should not expand into a broad intelligence platform. It should tighten around a narrower question:

"Given this order, do today's market conditions improve or hurt profit versus yesterday?"

**Decision**

Upgrade the homepage from a monitoring dashboard into a profit decision page while keeping the existing `汇率 / 关税 / 政策` pages as supporting detail pages.

This iteration includes only three additions:

1. A profit model for a single order scenario
2. A freight data source and historical freight lookup
3. A redesigned homepage centered on profit calculation, comparison, and attribution

This iteration explicitly excludes:

- persisted profit snapshots
- VAT / consumption tax
- ERP or order-system integration
- customer-level analysis
- demand, social, or commodity signals in the core formula
- a full site IA rewrite

## Product Goal

Turn the homepage into a decision surface that answers:

- can this order still work today at the current price
- is profit better or worse than yesterday
- which factor is driving the change: FX, tariff, or freight

## MVP Scope

### In scope

- order-level contribution profit calculator
- support for `FOB` and `CIF`
- support for quote currencies `USD`, `AED`, `SAR`
- automatic input of FX, tariff, anti-dumping duty, export rebate rate, and baseline freight
- manual override for freight
- yesterday-vs-today comparison using the same manual inputs and different market data
- attribution split across FX, tariff, and freight
- homepage redesign to surface calculator, attribution, and key curves

### Out of scope

- VAT / excise / local tax modeling
- account login or saved scenarios
- profit snapshot table
- exact deal freight normalization beyond baseline + override
- commodity-cost prediction using rubber futures

## Core Model

The system should calculate order contribution profit, not an accounting-grade net profit.

### User inputs

- destination country
- HS code
- trade term: `FOB` or `CIF`
- quote currency: `USD`, `AED`, or `SAR`
- quote unit price
- quantity
- product cost
- misc fees
- route / container type
- freight value
  defaulted from system baseline, editable by user

### System-derived inputs

- FX rate
- base import tariff rate
- anti-dumping duty rate
- export rebate rate
- freight baseline for selected route/container

### Formula

1. `revenue_cny = quoted_amount * fx_rate`
2. `import_tariff = cif_value * import_tariff_rate`
3. `anti_dumping = cif_value * anti_dumping_rate`
4. `export_rebate = fob_value * export_rebate_rate`
5. `profit = revenue_cny - product_cost - freight_cost - misc_fees - import_tariff - anti_dumping + export_rebate`
6. `margin = profit / revenue_cny`

### Comparison logic

For yesterday-vs-today:

- keep all manual inputs constant
- compute one result with today's market values
- compute one result with yesterday's market values
- compare profit and margin deltas

## Attribution Logic

The first version should only attribute profit deltas to:

- FX
- tariff
- freight

Recommended approach:

1. Compute a base result with yesterday's full market data
2. Replace only FX with today's FX and record delta
3. Replace tariff values with today's tariff values and record delta
4. Replace freight baseline/selected freight with today's freight context and record delta
5. The sum of deltas should approximate the overall daily difference

This is intentionally simple and explainable. It is sufficient for MVP.

## Homepage Structure

Keep the existing supporting pages. Replace the current homepage content with three sections.

### 1. Profit Calculator

Left side:

- destination
- HS code
- trade term
- quote currency
- quote price
- quantity
- product cost
- misc fees
- route / container
- freight baseline and override input

Right side:

- current profit
- current margin
- yesterday comparison
- dominant driver
- concise risk/action hint

### 2. Profit Attribution

Three cards:

- FX contribution
- tariff contribution
- freight contribution

Each card shows:

- daily delta in CNY
- direction
- whether it is helping or hurting profit

### 3. Key Factor Trends

- FX chart
- freight chart
- tariff / policy event markers
- period toggle: 7 / 30 / 90 days

Homepage responsibility:

- decision

Supporting pages responsibility:

- detail and source explanation

## Freight Strategy

The freight source should be treated as a market baseline, not as the exact order freight.

Rules:

- user selects destination + route + container type
- system fills a baseline freight value from historical freight data
- user can override it with actual negotiated freight
- calculations use override if present, otherwise baseline
- UI should show both "baseline" and "actual used" to avoid ambiguity

## Data Model Direction

Even without persistent snapshots, implementation should define stable internal shapes.

Suggested domain objects:

- `OrderInput`
- `MarketSnapshot`
- `ProfitResult`
- `AttributionResult`

This prevents the page from turning into unstructured component state and makes future persistence easier.

## Data Priorities

### Required now

- `AED / SAR / USD` FX history
- current and historical tariff data
- anti-dumping duty field support
- export rebate rate source
- baseline freight history

### Manual now

- misc fees
- special handling fees
- actual negotiated freight override

### Deferred

- rubber futures
- market demand signals
- search/social/news sentiment as profit inputs

## Key Risks

### 1. Trade-term confusion

`FOB` and `CIF` must be clearly labeled in both formula handling and UI.

### 2. Tax base confusion

Tariff calculations need a consistent declared base. MVP should default to CIF value and label that explicitly.

### 3. Baseline-vs-actual freight confusion

The system must not imply baseline freight equals actual order freight. The override path must be obvious.

## Implementation Direction

Build in this order:

1. define typed calculation inputs and outputs
2. add freight data ingestion and history query path
3. implement reusable profit calculation layer
4. redesign homepage around calculator + attribution + trends
5. wire comparison and attribution
6. reuse existing charts and event data where possible

## Recommended Next Step

Proceed to implementation planning with a narrow scope:

- one homepage transformation
- one reusable calculation layer
- one freight ingestion/query slice

Do not expand beyond that before the first profit decision flow works end to end.
