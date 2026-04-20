# 决策建议模块设计

**目标**

在总览页新增一个“决策建议”模块，让系统不只展示利润结果，而是明确回答：

- 当前报价环境是安全、关注还是承压
- 较昨日利润是改善还是收缩
- 主驱动因子是什么
- 当前建议动作是什么

**产品定位**

这不是 AI 决策模块，而是一个规则驱动的建议引擎。第一期由规则和模板输出结论，后续再为 AI 解释层预留入口。

**设计原则**

1. 先给结论，再给解释
2. 规则先行，AI 后置
3. AI 只负责解释，不负责计算或阈值判定
4. 页面只展示结果，不承载判断逻辑

**放置位置**

放在总览页第一屏，与利润测算结果区域同层级。目标是让用户在输入参数并完成测算后，第一眼看到“状态 + 动作”。

建议结构：

- 顶部：状态徽标
- 中间：一句 summary
- 下方：主驱动、建议动作、风险提醒

**数据结构**

```ts
type AdviceStatus = 'healthy' | 'watch' | 'pressure'
type AdviceDriver = 'fx' | 'freight' | 'duties' | 'mixed'
type AdviceAction =
  | 'hold_quote'
  | 'raise_quote'
  | 'review_freight'
  | 'review_policy'
  | 'manual_check'

interface DecisionAdvice {
  status: AdviceStatus
  statusLabel: string
  summary: string
  profitDeltaCny: number
  profitDeltaPct: number
  dominantDriver: AdviceDriver
  dominantDriverLabel: string
  action: AdviceAction
  actionLabel: string
  warnings: string[]
  explanation: string[]
  aiSummary?: string | null
}
```

**输入来源**

建议引擎第一期只消费现有可用结果：

- `todayResult`
- `yesterdayResult`
- `attribution`
- `selectedMarketValues`
- `recentPolicies.length`

第一期不直接读取原始数据库。

**规则判定**

### 1. 利润状态

- `margin >= 15%` -> `healthy`
- `8% <= margin < 15%` -> `watch`
- `margin < 8%` -> `pressure`

修正：

- 若 `profitDeltaPct <= -10%`，状态下调一档
- 若 `profitDeltaPct >= +10%`，只增强 summary，不上调状态

### 2. 主驱动因子

基于现有 `attribution`：

- 若单一因子绝对值最大且占总变化 50% 以上，则该因子为主驱动
- 否则为 `mixed`

### 3. 建议动作

- `healthy + fx` -> `hold_quote`
- `healthy + freight` -> `review_freight`
- `watch + freight` -> `review_freight`
- `watch + fx` -> `manual_check`
- `pressure + freight` -> `raise_quote`
- `pressure + fx` -> `raise_quote`
- `pressure + recentPolicies.length > 0` -> `review_policy`
- 其余 -> `manual_check`

**模板解释层**

第一期不用 AI，直接用模板输出：

- `summary`: 一句结论
- `explanation`: 2-3 条说明
- `warnings`: 风险提醒数组

示例：

- 当前利润环境偏承压
- 较昨日利润收缩明显，主因来自运费变化
- 建议先手工覆盖运费后再决定是否维持原报价

**AI 预留位**

第一期只预留：

```ts
aiSummary?: string | null
```

第二期可将 `DecisionAdvice` 作为结构化输入喂给 AI，生成管理层口径摘要。AI 不参与利润计算、不参与规则判定。

**第一期范围**

只做：

1. `DecisionAdvice` 数据结构
2. 规则引擎
3. 模板解释
4. 总览页展示卡片

不做：

- AI 模型接入
- 政策深度结构化
- 多市场横向比较
- 晨报/周报

**成功标准**

- 利润测算完成后，总览页能出现“决策建议”模块
- 模块能给出状态、主因、建议动作、风险提醒
- 不依赖 AI 也能工作
- 数据不足时有明确兜底状态
