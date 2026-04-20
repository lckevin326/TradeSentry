# CCFI Freight Mapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 抓取上海航运交易所 CCFI 中东航线指数，并把指数变化映射成现有 `freight_rates` 默认运费数据。

**Architecture:** 新增一个 CCFI 抓取与解析层，解析 `PERSIAN GULF/RED SEA SERVICE` 周度指数，再按预设锚点价推导 6 个默认运费，最后写入现有 `freight_rates` 表。利润测算、首页和运费页继续复用已有 `freight_rates` 读取逻辑，只调整文案和来源说明。

**Tech Stack:** Next.js App Router, TypeScript, Supabase, cheerio, node:test

---

### Task 1: 定义锚点配置与纯函数映射

**Files:**
- Create: `lib/freight/anchors.ts`
- Test: `lib/freight/anchors.test.ts`

**Step 1: Write the failing test**

写测试覆盖：
- 6 个 routeKey 都有锚点配置
- 给定 `anchorIndex=1800.6`、`currentIndex=1834.9`、`anchorFreightCny=1250` 时，能推导出稳定数值
- 非法指数值抛错

**Step 2: Run test to verify it fails**

Run: `node --test lib/freight/anchors.test.ts`
Expected: FAIL，模块不存在

**Step 3: Write minimal implementation**

实现：
- `FREIGHT_ROUTE_ANCHORS`
- `deriveFreightFromIndex`
- `buildDerivedFreightRows`

**Step 4: Run test to verify it passes**

Run: `node --test lib/freight/anchors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/freight/anchors.ts lib/freight/anchors.test.ts
git commit -m "feat: add freight anchor mapping"
```

### Task 2: 实现 CCFI 页面解析器

**Files:**
- Create: `lib/scrapers/ccfi.ts`
- Create: `lib/scrapers/fixtures/ccfi-persian-gulf.html`
- Test: `lib/scrapers/ccfi.test.ts`

**Step 1: Write the failing test**

测试覆盖：
- 解析出上期日期、本期日期
- 解析出 `PERSIAN GULF/RED SEA SERVICE`
- 拿到上期指数、本期指数、涨跌幅

**Step 2: Run test to verify it fails**

Run: `node --test lib/scrapers/ccfi.test.ts`
Expected: FAIL，模块不存在

**Step 3: Write minimal implementation**

实现：
- `fetchCcfiPageHtml`
- `parsePersianGulfCcfi`
- 解析器按文本定位航线，而不是按固定行号

**Step 4: Run test to verify it passes**

Run: `node --test lib/scrapers/ccfi.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/scrapers/ccfi.ts lib/scrapers/ccfi.test.ts lib/scrapers/fixtures/ccfi-persian-gulf.html
git commit -m "feat: parse ccfi persian gulf index"
```

### Task 3: 把 CCFI 指数接入现有运费抓取入口

**Files:**
- Modify: `lib/scrapers/freight.ts`
- Modify: `app/api/fetch/freight/route.ts`
- Test: `lib/scrapers/freight.test.ts`

**Step 1: Write the failing test**

补测试覆盖：
- `fetchAndSaveFreight` 可在注入的 CCFI 指数下生成 6 个 `freight_rates` 行
- `source_url` 写入 `CCFI` 页面地址
- `date` 取本期日期

**Step 2: Run test to verify it fails**

Run: `node --test lib/scrapers/freight.test.ts`
Expected: FAIL，当前实现依赖 `FREIGHT_SOURCE_URL` HTML 表格

**Step 3: Write minimal implementation**

改造：
- 去掉对 `FREIGHT_SOURCE_URL` 的硬依赖
- 默认抓取 `https://www.sse.net.cn/index/singleIndex?indexType=ccfi`
- 解析中东指数
- 用锚点生成 6 个 route 的默认运费
- `saveFreightRows` 继续写 `freight_rates`

**Step 4: Run test to verify it passes**

Run: `node --test lib/scrapers/freight.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/scrapers/freight.ts lib/scrapers/freight.test.ts app/api/fetch/freight/route.ts
git commit -m "feat: derive freight rates from ccfi index"
```

### Task 4: 调整首页和运费页文案与来源说明

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/ProfitDecisionPageClient.tsx`
- Modify: `app/freight/page.tsx`
- Test: `app/page.test.tsx`
- Test: `app/freight/page.test.tsx`

**Step 1: Write the failing test**

补测试覆盖：
- 首页出现“默认运费”或“CCFI 指数映射”语义
- 运费页说明中出现“基于 CCFI 中东指数推导”

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs app/page.test.tsx app/freight/page.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

更新文案，避免把指数映射值说成真实柜价。

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs app/page.test.tsx app/freight/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/page.tsx components/ProfitDecisionPageClient.tsx app/freight/page.tsx app/page.test.tsx app/freight/page.test.tsx
git commit -m "feat: clarify ccfi-derived freight copy"
```

### Task 5: 全链路验证

**Files:**
- Modify: `vercel.json` if needed

**Step 1: Run targeted tests**

Run:

```bash
node --test lib/freight/anchors.test.ts lib/scrapers/ccfi.test.ts lib/scrapers/freight.test.ts
node ./lib/profit/test-runner.mjs app/page.test.tsx app/freight/page.test.tsx components/ProfitCalculator.test.tsx
```

Expected: PASS

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Smoke test fetch route**

Run:

```bash
curl -X POST http://localhost:3000/api/fetch/freight
```

Expected: 返回 `ok: true`，并包含 `reportDate / saved / scanned`

**Step 4: Commit**

```bash
git add .
git commit -m "feat: source freight defaults from ccfi"
```
