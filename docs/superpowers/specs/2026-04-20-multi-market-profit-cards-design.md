# 多市场利润率卡片 + /markets 对比页 设计文档

**日期：** 2026-04-20  
**范围：** 功能点 1（今日简报建议层）+ 功能点 2（多市场横向对比）

---

## 目标

将首页从"单市场测算结果展示"升级为"5市场今日决策看板"，让用户一眼判断今天哪个市场可接单、哪个市场需谨慎，并提供 /markets 页做深入对比。

---

## 方案选择

采用 **方案 B**：首页顶部替换为5市场利润率卡片，/markets 作为独立页面提供完整对比图表。  
理由：改动范围可控，首页计算器/图表/政策区保持不变，/markets 可随数据积累独立演进。

---

## 数据层设计

### 默认市场参数

5个市场共享一组默认 OrderInput 参数，用于首页卡片和 /markets 页计算：

```typescript
// lib/profit/market-defaults.ts
export const DEFAULT_ORDER_BASE = {
  hsCode: '4011209000',
  unitPriceCny: 95,
  quantity: 200,
  containerType: '40HQ',
}

export const MARKETS = [
  { key: 'UAE', label: '迪拜 UAE', quoteCurrency: 'AED', destinationCountry: 'AE', routeKey: 'SHA-DXB' },
  { key: 'SA',  label: '沙特 SA',  quoteCurrency: 'SAR', destinationCountry: 'SA', routeKey: 'SHA-JED' },
  { key: 'KW',  label: '科威特 KW', quoteCurrency: 'KWD', destinationCountry: 'KW', routeKey: 'SHA-KWI' },
  { key: 'QA',  label: '卡塔尔 QA', quoteCurrency: 'QAR', destinationCountry: 'QA', routeKey: 'SHA-DOH' },
  { key: 'OM',  label: '阿曼 OM',  quoteCurrency: 'OMR', destinationCountry: 'OM', routeKey: 'SHA-MCT' },
]
```

### 今日 vs 昨日利润率

- 今日：调用现有 `loadTodayMarketSnapshot()` + `calculateProfitResult()`
- 昨日：从 Supabase 查前一天各表数据，复用同一计算逻辑
  - `exchange_rates`：`date <= yesterday ORDER BY date DESC LIMIT 1`
  - `tariffs`：`fetched_at <= yesterday ORDER BY fetched_at DESC LIMIT 1`（注意列名是 `fetched_at`，非 `date`）
  - `freight_rates`：`date <= yesterday ORDER BY date DESC LIMIT 1`
- 封装为 `GET /api/markets/today` → 返回5市场的 `{ key, marginPct, yesterdayMarginPct, delta, drivers }[]`

### 归因驱动因子

复用现有 `ProfitAttribution`（已有 delta 分解：汇率/运费/关税贡献），取 UAE 市场的归因作为首页归因行展示。

### 推荐状态规则

```
marginPct >= 13%  → 可接单（绿）
10% <= marginPct < 13% → 谨慎（橙）
marginPct < 10%   → 暂停（红）
```

---

## 首页改动

**文件：** `app/page.tsx` + `components/MarketCardsSection.tsx`（新增）

### 改动范围

- 移除现有4个指标卡（当前利润、人民币/AED、中东运费、政策观察）
- 替换为 `<MarketCardsSection />` 组件，内含：
  - 5个市场卡片（并排，各显示利润率、vs昨日 delta、推荐状态标签）
  - 归因行（今日变化主因：汇率/运费/关税，附「查看市场详情 →」链接）
- 首页其余部分（HomeSummaryCard / DecisionAdviceCard / 计算器 / 图表 / 政策列表）**不动**

### 数据加载

`app/page.tsx` 的 `getProfitDecisionPageData()` 新增调用 `/api/markets/today`，结果以 prop 传给 `MarketCardsSection`（Server Component，不增加客户端 bundle）。

---

## /markets 页面

**路由：** `app/markets/page.tsx`（新建 Server Component）  
**导航：** Nav.tsx 新增「市场对比」入口

### 三个区块

**① 利润率柱状图**
- 5条竖柱，高度按 marginPct 等比例缩放
- 标注警戒线（12%）和建议下限（13%）
- 使用纯 CSS 实现（无需引入图表库）

**② 各市场驱动因子明细表**
- 列：市场 / 货币 / CNY汇率 / 进口关税 / 运费/柜 / 利润率 / vs昨日 / 建议
- 数据来自 `/api/markets/today`

**③ 14日趋势折线图**
- 所需数据：`profit_snapshots` 表（功能点6，尚未建立）
- **上线策略：先用占位提示**「历史趋势图即将上线，数据积累中」，功能点6完成后填充

---

## 新增文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `lib/profit/market-defaults.ts` | 新建 | 5市场默认参数常量 + MARKETS 数组 |
| `app/api/markets/today/route.ts` | 新建 | GET → 5市场今日+昨日利润率+归因 |
| `components/MarketCardsSection.tsx` | 新建 | 首页5卡片 + 归因行 |
| `app/markets/page.tsx` | 新建 | /markets Server Component |

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `app/page.tsx` | getProfitDecisionPageData 新增 markets fetch；传 prop 给 MarketCardsSection |
| `components/Nav.tsx` | 新增「市场对比」导航项 |

---

## 错误处理

- 某市场数据缺失（无汇率/关税/运费）：该市场卡片显示「数据暂缺」灰色占位，不阻断其他市场渲染
- API 超时：整体降级，首页卡片区显示「市场数据加载中，请刷新」

---

## 不在此次范围内

- 历史利润率存储（profit_snapshots 表）→ 功能点6
- 趋势折线图真实数据 → 依赖功能点6
- 用户自定义默认参数 → 未来迭代

