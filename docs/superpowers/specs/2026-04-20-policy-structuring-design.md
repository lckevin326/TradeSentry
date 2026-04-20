# 政策结构化 + 影响矩阵 设计文档

**日期：** 2026-04-20  
**功能：** Feature 4 — 政策结构化 + 影响矩阵

## 背景

当前 `policies` 表只存储标题、摘要、来源、关键词等原始字段，无法回答"这条政策对哪个市场有多大影响"。用户（轮胎外贸经营者）每天早上需要一眼看出哪些政策值得关注、影响哪些市场报价决策。

## 目标

1. 每条政策入库后，由 AI 自动分析并填入结构化影响字段
2. `/policies` 页面展示影响等级、影响国家、量化估算
3. 新增影响矩阵表：政策 × 市场的二维视图

---

## 数据层

### policies 表新增字段

```sql
ALTER TABLE policies
  ADD COLUMN impact_level      text CHECK (impact_level IN ('high','medium','low')),
  ADD COLUMN affected_countries text[],
  ADD COLUMN effective_date    date,
  ADD COLUMN quantified_impact text,
  ADD COLUMN ai_tagged_at      timestamptz;
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `impact_level` | `'high'/'medium'/'low'/null` | AI 判断的影响等级 |
| `affected_countries` | `text[]` | 影响的 GCC 市场，如 `['UAE','SA']` |
| `effective_date` | `date/null` | 政策生效日期，能提取则填，否则 null |
| `quantified_impact` | `text/null` | AI 数值估算，如 `"+1~2% 关税"` |
| `ai_tagged_at` | `timestamptz/null` | 打标完成时间，null 表示待处理 |

### TypeScript 类型更新

`types/index.ts` 中 `Policy` 接口新增上述 5 个字段（均可为 null）。

---

## AI 打标层

### lib/ai/policy-tagger.ts（新建）

调用 Claude API（`claude-3-haiku-20240307`，速度快成本低），输入政策标题 + 摘要，返回结构化 JSON。

**Prompt 约束：**
- 只分析与中国轮胎出口到 GCC 六国（UAE/SA/KW/QA/OM/BH）相关的影响
- `impact_level`：high = 直接影响关税/退税/禁令，medium = 间接影响贸易环境，low = 背景参考
- `affected_countries`：只从 `['UAE','SA','KW','QA','OM','BH']` 中选，不相关则返回空数组
- `quantified_impact`：给出数值范围估算（如 `"+1~2% 关税"`），无法估算则返回 null
- `effective_date`：从文本中提取 ISO 日期，无法提取则返回 null
- 输出为严格 JSON，不加解释文字

**错误处理：** AI 调用失败时，所有字段保持 null，`ai_tagged_at` 不写入（下次可重试）。

### 调用时机

1. **入库时同步打标**：`fetchAndSavePolicies` 中每条政策 upsert 成功后立即调用
2. **历史补标接口**：`POST /api/fetch/policy-tags`，查询 `ai_tagged_at IS NULL` 的记录批量处理

---

## API 层

### POST /api/fetch/policy-tags（新建）

- 查询所有 `ai_tagged_at IS NULL` 的政策
- 逐条调用 `enrichPolicyWithAI`，写回结构化字段
- 返回 `{ processed: N, failed: N }`
- 用于一次性补标历史数据，也可后续按需触发

---

## 前端层

### Policy 类型扩展

`PolicyTimeline` 和相关组件复用已更新的 `Policy` 类型，无需单独改接口。

### PolicyTimeline 组件更新

每条政策卡片新增三处展示：
1. **影响等级徽标**：红/黄/绿色圆点 + 文字（高/中/低），null 时不显示
2. **影响国家 chips**：小标签列出 `affected_countries`，空数组时不显示
3. **量化影响文字**：灰色小字展示 `quantified_impact`，null 时不显示

### PolicyImpactMatrix 组件（新建）

影响矩阵表，只展示 `impact_level IN ('high','medium')` 的政策：

| | UAE | SA | KW | QA | OM |
|---|---|---|---|---|---|
| 政策标题（截断）| ✓ +1~2% | ✓ | — | — | — |

- 列 = 5 个主力市场（BH 不在主力市场中，不显示列）
- 格子有影响：显示 ✓ + `quantified_impact`（若有）
- 格子无影响：显示 —
- 点击政策标题跳转原文链接

### /policies 页面更新

布局：
1. 原有汇率图表（保留）
2. 原有 PolicyTimeline（保留，新增结构化字段展示）
3. **新增** PolicyImpactMatrix（放在 Timeline 上方，作为"快速摘要"）

---

## 实现顺序

1. SQL migration：policies 表加字段
2. `lib/ai/policy-tagger.ts`：AI 打标逻辑
3. 更新 `types/index.ts`：Policy 类型加字段
4. 更新 `lib/scrapers/policies.ts`：入库后调用打标
5. 新建 `POST /api/fetch/policy-tags`：历史补标接口
6. 更新 `PolicyTimeline`：展示结构化字段
7. 新建 `PolicyImpactMatrix` 组件
8. 更新 `/policies` 页面：加入矩阵组件

---

## 约束与边界

- AI 打标失败不影响政策入库，字段保持 null，页面做好 null 展示兜底
- `quantified_impact` 为 AI 估算，页面加"仅供参考"标注
- 矩阵只展示近 90 天内的高/中影响政策，避免表格过长
- 不新增 Supabase 表，所有数据在 `policies` 表内扩展
