# 首页综合摘要与经营摘要增强 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为现有决策建议模块补充经营摘要输出，并在首页新增“今日出口环境摘要”区，形成“结论 -> 建议 -> 证据”的读序。

**Architecture:** 扩展 `lib/profit` 下的结构化 advice 输出，不引入 AI 和新接口。页面层只消费新的 `DecisionAdvice` 字段，并新增一个首页综合摘要组件，所有派生逻辑仍通过共享 helper 统一。

**Tech Stack:** Next.js App Router, TypeScript, React Server Components + Client Components, node:test, existing `lib/profit/test-runner.mjs`

---

### Task 1: 扩展经营摘要字段与规则输出

**Files:**
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/lib/profit/advice.ts`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/lib/profit/index.ts`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/lib/profit/advice.test.ts`

**Step 1: Write the failing test**

补测试覆盖：
- `DecisionAdvice` 生成 `executiveSummary`
- `DecisionAdvice` 生成 `driverBreakdown`
- `mixed` 场景下经营摘要不伪装成单驱动

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs lib/profit/advice.test.ts`
Expected: FAIL，因为新字段不存在或断言不成立

**Step 3: Write minimal implementation**

实现：
- `DecisionAdvice.executiveSummary`
- `DecisionAdvice.driverBreakdown`
- 基于 attribution 生成 breakdown
- 基于 status / delta / driver / action 生成经营口径摘要

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs lib/profit/advice.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/profit/advice.ts lib/profit/index.ts lib/profit/advice.test.ts
git commit -m "feat: enrich decision advice summary output"
```

### Task 2: 新增首页综合摘要派生逻辑

**Files:**
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/lib/profit/home-summary.ts`
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/lib/profit/home-summary.test.ts`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/app/page.tsx`

**Step 1: Write the failing test**

补测试覆盖：
- 有 `decisionAdvice` 时，能派生首页环境摘要
- 无 `decisionAdvice` 时，返回等待测算空态
- 关键信号正确组合汇率 / 运费 / 政策信息

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs lib/profit/home-summary.test.ts app/page.test.tsx`
Expected: FAIL，因为 helper/字段不存在

**Step 3: Write minimal implementation**

实现：
- `deriveHomeSummary(...)`
- 首页 data 增加 `homeSummary`
- 只消费现有数据，不发新请求

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs lib/profit/home-summary.test.ts app/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/profit/home-summary.ts lib/profit/home-summary.test.ts app/page.tsx
git commit -m "feat: add home summary data derivation"
```

### Task 3: 新增首页综合摘要组件

**Files:**
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/HomeSummaryCard.tsx`
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/HomeSummaryCard.test.tsx`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/ProfitDecisionPageClient.tsx`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/app/page.test.tsx`

**Step 1: Write the failing test**

补测试覆盖：
- 渲染综合结论
- 渲染三条关键信号
- 渲染关注项
- 空态显示“等待测算”

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs components/HomeSummaryCard.test.tsx app/page.test.tsx`
Expected: FAIL，因为组件不存在

**Step 3: Write minimal implementation**

实现：
- `HomeSummaryCard`
- 挂到顶部指标卡之后、决策建议之前
- 保持现有视觉风格，不重做整页样式体系

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs components/HomeSummaryCard.test.tsx app/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/HomeSummaryCard.tsx components/HomeSummaryCard.test.tsx components/ProfitDecisionPageClient.tsx app/page.test.tsx
git commit -m "feat: add home summary card"
```

### Task 4: 把经营摘要接入决策建议卡

**Files:**
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/DecisionAdviceCard.tsx`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/DecisionAdviceCard.test.tsx`

**Step 1: Write the failing test**

补测试覆盖：
- 显示 `executiveSummary`
- 显示 `driverBreakdown`
- 空态不显示这些区块

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs components/DecisionAdviceCard.test.tsx`
Expected: FAIL，因为新字段未渲染

**Step 3: Write minimal implementation**

实现：
- 在建议卡中加入经营摘要副区块
- 展示 2-3 条 driver breakdown
- 不显示 AI 文案

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs components/DecisionAdviceCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/DecisionAdviceCard.tsx components/DecisionAdviceCard.test.tsx
git commit -m "feat: add executive summary to decision advice card"
```

### Task 5: 全量验证

**Files:**
- Verify only

**Step 1: Run focused tests**

Run:

```bash
node ./lib/profit/test-runner.mjs \
  lib/profit/advice.test.ts \
  lib/profit/home-summary.test.ts \
  components/DecisionAdviceCard.test.tsx \
  components/HomeSummaryCard.test.tsx \
  app/page.test.tsx \
  components/ProfitCalculator.test.tsx
```

Expected: PASS

**Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS

**Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS

**Step 4: Manual smoke test**

验证：
- 首页能看到“今日出口环境摘要”
- 决策建议卡能看到经营摘要增强内容
- 无测算数据时，首页摘要和建议卡都显示空态
- 重新测算后，首页摘要和建议卡同步更新

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add home summary and executive advice brief"
```
