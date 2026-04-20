# Decision Advice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在总览页增加规则驱动的“决策建议”模块，基于现有利润测算结果输出状态、主因和建议动作。

**Architecture:** 新增一个 `lib/profit/advice.ts` 作为纯规则引擎，输入当前已有的利润结果、归因和市场值，输出稳定的 `DecisionAdvice` 对象。页面只展示该对象，不承载判断逻辑；解释文本第一期由模板层生成，并为后续 AI 解释预留字段。

**Tech Stack:** Next.js App Router, TypeScript, node:test, existing profit calculation pipeline

---

### Task 1: 定义建议引擎的数据结构和规则函数

**Files:**
- Create: `lib/profit/advice.ts`
- Create: `lib/profit/advice.test.ts`
- Modify: `lib/profit/index.ts`

**Step 1: Write the failing test**

覆盖：
- 利润率高时输出 `healthy`
- 利润率中等时输出 `watch`
- 利润率低时输出 `pressure`
- 运费为主因时建议 `review_freight`
- FX 为主因且承压时建议 `raise_quote`
- 多因子混合时返回 `mixed`

**Step 2: Run test to verify it fails**

Run: `node --test lib/profit/advice.test.ts`
Expected: FAIL，模块不存在

**Step 3: Write minimal implementation**

实现：
- `DecisionAdvice` 类型
- `buildDecisionAdvice(input)`
- 状态判断、主因判断、动作判断、模板 summary/explanation

**Step 4: Run test to verify it passes**

Run: `node --test lib/profit/advice.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/profit/advice.ts lib/profit/advice.test.ts lib/profit/index.ts
git commit -m "feat: add decision advice rules"
```

### Task 2: 把建议引擎接入总览页数据流

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `components/ProfitCalculator.tsx` if needed for type flow

**Step 1: Write the failing test**

覆盖：
- 当已有初始测算结果时，`getProfitDecisionPageData` 能产出 advice
- 当数据缺失时，advice 返回空或兜底状态，不让页面崩溃

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs app/page.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

实现：
- 在总览页数据对象里新增 `decisionAdvice`
- 只在存在 today/yesterday/attribution 时生成

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs app/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx components/ProfitCalculator.tsx
git commit -m "feat: wire decision advice into dashboard data"
```

### Task 3: 新增总览页决策建议组件

**Files:**
- Create: `components/DecisionAdviceCard.tsx`
- Create: `components/DecisionAdviceCard.test.tsx`
- Modify: `components/ProfitDecisionPageClient.tsx`

**Step 1: Write the failing test**

覆盖：
- 能展示状态标签
- 能展示 summary
- 能展示主驱动与建议动作
- 有风险提醒列表时正确渲染

**Step 2: Run test to verify it fails**

Run: `node --test components/DecisionAdviceCard.test.tsx`
Expected: FAIL，组件不存在

**Step 3: Write minimal implementation**

实现：
- `DecisionAdviceCard`
- 放到总览第一屏，和利润测算结果同层级
- 不引入 AI 文案，只渲染结构化结果

**Step 4: Run test to verify it passes**

Run: `node --test components/DecisionAdviceCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/DecisionAdviceCard.tsx components/DecisionAdviceCard.test.tsx components/ProfitDecisionPageClient.tsx
git commit -m "feat: add dashboard decision advice card"
```

### Task 4: 补数据不足的兜底与文案收口

**Files:**
- Modify: `lib/profit/advice.ts`
- Modify: `components/DecisionAdviceCard.tsx`
- Modify: `components/ProfitDecisionPageClient.tsx`

**Step 1: Write the failing test**

覆盖：
- 无建议数据时展示占位文案
- 缺少足够市场数据时，不展示误导性结论

**Step 2: Run test to verify it fails**

Run:

```bash
node --test lib/profit/advice.test.ts components/DecisionAdviceCard.test.tsx
```

Expected: FAIL

**Step 3: Write minimal implementation**

实现：
- `decisionAdvice = null` 时页面显示“完成测算后生成建议”
- 不伪造状态

**Step 4: Run test to verify it passes**

Run:

```bash
node --test lib/profit/advice.test.ts components/DecisionAdviceCard.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add lib/profit/advice.ts components/DecisionAdviceCard.tsx components/ProfitDecisionPageClient.tsx
git commit -m "feat: add decision advice fallbacks"
```

### Task 5: 全量验证

**Files:**
- Verify only

**Step 1: Run focused tests**

Run:

```bash
node ./lib/profit/test-runner.mjs \
  lib/profit/advice.test.ts \
  components/DecisionAdviceCard.test.tsx \
  app/page.test.tsx \
  components/ProfitCalculator.test.tsx
```

Expected: PASS

**Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS

**Step 3: Manual smoke test**

验证：
- 总览页完成测算后出现“决策建议”
- 状态 / 主因 / 动作 / 风险提醒可读
- 数据不足时不误导

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add decision advice module"
```
