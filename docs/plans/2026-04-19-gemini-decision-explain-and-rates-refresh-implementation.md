# Gemini 解释层与汇率手动更新 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为利润决策页增加可手动触发的 Gemini 经营解读，并为汇率页增加手动更新汇率入口。

**Architecture:** 保持规则层负责结论，新增一个服务端 AI 解释接口，前端在首页与决策建议卡共享同一份 AI 状态。汇率页不新增抓取链路，只复用现有 `/api/fetch/rates` 并在成功后刷新当前数据。

**Tech Stack:** Next.js App Router, TypeScript, React Client Components, node:test, existing `lib/profit/test-runner.mjs`, Gemini REST API

---

### Task 1: 新增 Gemini 决策解释服务

**Files:**
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/lib/ai/decision-brief.ts`
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/lib/ai/decision-brief.test.ts`

**Step 1: Write the failing test**

补测试覆盖：
- 缺少 `GEMINI_API_KEY` 时抛明确错误
- 输入不足时拒绝生成
- 成功时返回 `analysis/generatedAt/model`
- prompt 里只使用结构化字段，不依赖页面 DOM

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs lib/ai/decision-brief.test.ts`
Expected: FAIL，因为文件和实现不存在

**Step 3: Write minimal implementation**

实现：
- `buildDecisionBriefPrompt(input)`
- `generateDecisionBrief(input, deps?)`
- 服务端读取 `process.env.GEMINI_API_KEY`
- 默认模型读取 `process.env.GEMINI_MODEL ?? 'gemini-3.1-pro'`
- 支持注入 fetch 方便测试

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs lib/ai/decision-brief.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/ai/decision-brief.ts lib/ai/decision-brief.test.ts
git commit -m "feat: add gemini decision brief service"
```

### Task 2: 新增 AI 解读接口

**Files:**
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/app/api/ai/decision-brief/route.ts`
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/app/api/ai/decision-brief/route.test.ts`

**Step 1: Write the failing test**

补测试覆盖：
- 成功请求返回 200 和结构化结果
- 输入缺失返回 400
- 未配置 key 返回明确错误
- 上游异常返回失败响应

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs app/api/ai/decision-brief/route.test.ts`
Expected: FAIL，因为接口不存在

**Step 3: Write minimal implementation**

实现：
- `POST /api/ai/decision-brief`
- 校验 body
- 调 `generateDecisionBrief`
- 返回 `{ ok, data?, error? }`

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs app/api/ai/decision-brief/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/ai/decision-brief/route.ts app/api/ai/decision-brief/route.test.ts
git commit -m "feat: add decision brief api route"
```

### Task 3: 首页与决策建议卡共享 AI 解读状态

**Files:**
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/ProfitDecisionPageClient.tsx`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/HomeSummaryCard.tsx`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/DecisionAdviceCard.tsx`
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/ProfitDecisionAiBrief.tsx`
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/ProfitDecisionAiBrief.test.tsx`
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/components/ProfitDecisionPageClient.test.tsx`

**Step 1: Write the failing test**

补测试覆盖：
- 未测算时按钮 disabled
- 已测算时可触发生成
- AI 成功后首页与决策建议卡显示同一份解读
- 失败时保留旧结果并显示错误

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs components/ProfitDecisionAiBrief.test.tsx components/ProfitDecisionPageClient.test.tsx`
Expected: FAIL，因为共享 AI 状态和组件不存在

**Step 3: Write minimal implementation**

实现：
- 抽一个 `ProfitDecisionAiBrief` 展示组件
- `ProfitDecisionPageClient` 维护共享 AI 状态
- 首页卡与建议卡都消费同一结果
- 按钮手动调用 `/api/ai/decision-brief`

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs components/ProfitDecisionAiBrief.test.tsx components/ProfitDecisionPageClient.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/ProfitDecisionPageClient.tsx components/HomeSummaryCard.tsx components/DecisionAdviceCard.tsx components/ProfitDecisionAiBrief.tsx components/ProfitDecisionAiBrief.test.tsx components/ProfitDecisionPageClient.test.tsx
git commit -m "feat: add shared manual ai brief to decision page"
```

### Task 4: 汇率页增加手动更新

**Files:**
- Modify: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/app/exchange-rates/page.tsx`
- Create: `/Users/liuchao/Product/AI/Product/guan/.worktrees/codex-profit-decision-page/app/exchange-rates/page.test.tsx`

**Step 1: Write the failing test**

补测试覆盖：
- 渲染 `手动更新汇率` 按钮
- 点击时调用 `/api/fetch/rates`
- 成功后重新拉 `/api/exchange-rates`
- 失败时显示错误状态

**Step 2: Run test to verify it fails**

Run: `node ./lib/profit/test-runner.mjs app/exchange-rates/page.test.tsx`
Expected: FAIL，因为按钮和交互不存在

**Step 3: Write minimal implementation**

实现：
- 提取当前汇率数据加载函数
- 新增手动更新按钮和状态区
- 成功后重新加载当前币种/周期数据

**Step 4: Run test to verify it passes**

Run: `node ./lib/profit/test-runner.mjs app/exchange-rates/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/exchange-rates/page.tsx app/exchange-rates/page.test.tsx
git commit -m "feat: add manual rates refresh action"
```

### Task 5: 全量验证

**Files:**
- Verify only

**Step 1: Run focused tests**

Run:

```bash
node ./lib/profit/test-runner.mjs \
  lib/ai/decision-brief.test.ts \
  app/api/ai/decision-brief/route.test.ts \
  components/ProfitDecisionAiBrief.test.tsx \
  components/ProfitDecisionPageClient.test.tsx \
  app/exchange-rates/page.test.tsx
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
- 首页完成测算后可手动生成 AI 解读
- 首页与决策建议卡展示相同 AI 内容
- AI 失败时可重试，规则卡仍正常
- 汇率页可手动更新，成功后图表和表格刷新

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add manual ai brief and rates refresh"
```
