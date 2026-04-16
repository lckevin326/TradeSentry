# 关税监控系统设计文档

**日期**：2026-04-16  
**项目**：面向外贸轮胎出口客户的关税、汇率、政策实时监控系统  
**阶段**：Phase 1（内部运营看板）→ Phase 2（客户自助平台）

---

## 一、背景与目标

客户从事中国轮胎出口业务，主要目标市场为 UAE（迪拜）及 GCC 六国（沙特、科威特、卡塔尔、巴林、阿曼）。业务对以下三类数据高度敏感：

1. **关税**：HS 4011 轮胎品类在 GCC 各国的进口关税税率
2. **汇率**：人民币（CNY）兑 GCC 各国货币的汇率及波动
3. **贸易政策**：中国商务部、WTO 发布的与轮胎/GCC 相关的政策公告

**Phase 1 目标**：搭建内部运营看板，运营人员查看数据后手动整理推送给客户。  
**Phase 2 目标**：扩展为客户可直接登录的自助平台 + 自动推送（微信/邮件）。

---

## 二、技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | Next.js 14（App Router） | 前后端一体，API Routes 处理数据抓取 |
| 样式 | Tailwind CSS | 内置响应式，移动端适配 |
| 图表 | Recharts | 纯 JS，无原生依赖 |
| 数据库 | Supabase（PostgreSQL） | 从一开始即用，本地开发直连，零迁移成本 |
| 数据库客户端 | `@supabase/supabase-js` | 纯 JS SDK |
| 定时任务（本地） | `node-cron` | 本地开发时使用 |
| 定时任务（生产） | Vercel Cron Jobs | 上线后通过 vercel.json 配置 |
| 网页抓取 | `cheerio` | 轻量 HTML 解析，无需启动浏览器 |
| HTTP 请求 | 原生 `fetch` | 无额外依赖 |

---

## 三、数据来源

| 数据类型 | 来源 | 更新方式 | 频率 |
|---------|------|---------|------|
| 汇率 | ExchangeRate-API（免费套餐） | 自动 Cron | 每日 09:00 |
| 关税 | ITC MacMap（macmap.org） | 手动触发按钮 | 按需 |
| 政策 | 商务部公告页 + WTO 通报页 | 自动 Cron | 每日 10:00 |

**汇率货币对**：CNY/AED、CNY/SAR、CNY/KWD、CNY/QAR、CNY/BHD、CNY/OMR

**关税 HS 编码**：4011.10、4011.20、4011.40、4011.50、4011.70、4011.80（涵盖乘用车、商用车、摩托车、农业机械等主要轮胎类型）

**政策关键词过滤**：轮胎、橡胶、4011、tire、GCC、UAE、关税、tariff

---

## 四、数据库结构

### `exchange_rates`
```sql
id          uuid primary key default gen_random_uuid()
date        date not null
base        text not null default 'CNY'
target      text not null          -- AED / SAR / KWD / QAR / BHD / OMR
rate        numeric(12,6) not null
change_pct  numeric(8,4)           -- 相对前一日涨跌幅（%）
created_at  timestamptz default now()
```

### `tariffs`
```sql
id            uuid primary key default gen_random_uuid()
hs_code       text not null          -- 如 4011.10
country       text not null          -- UAE / SA / KW / QA / BH / OM
rate_pct      numeric(8,4) not null  -- 当前税率
prev_rate_pct numeric(8,4)           -- 上次税率
effective_date date
changed       boolean default false
source_url    text
fetched_at    timestamptz default now()
```

### `policies`
```sql
id          uuid primary key default gen_random_uuid()
title       text not null
summary     text
source      text not null   -- mofcom / wto
country     text            -- 涉及国家（可为空表示全球）
published_at timestamptz
url         text
keywords    text[]          -- 命中的关键词
is_relevant boolean default false
created_at  timestamptz default now()
```

### `alerts`
```sql
id          uuid primary key default gen_random_uuid()
type        text not null   -- tariff_change / rate_spike / new_policy
ref_table   text            -- 关联来源表名
ref_id      uuid            -- 关联记录 ID
severity    text not null   -- high / medium / low
message     text not null
is_read     boolean default false
created_at  timestamptz default now()
```

---

## 五、数据抓取逻辑

### 汇率抓取（`/api/fetch/rates`）
1. Cron 每日 09:00 触发（或手动调用）
2. 调用 ExchangeRate-API，获取 CNY 兑 6 种货币的最新汇率
3. 查询昨日记录，计算 `change_pct`
4. 写入 `exchange_rates`
5. 若 `|change_pct| > 0.5%`（可通过 `.env` 配置阈值），在 `alerts` 中生成 `rate_spike` 记录，severity 根据幅度分级：
   - `|change_pct| > 1%` → high
   - `0.5%~1%` → medium

### 关税抓取（`/api/fetch/tariffs`）
1. `/tariffs` 页面点击「更新关税」按钮触发 POST 请求
2. 遍历 6 国 × 6 个 HS 子目（共 36 条查询）
3. 通过 `cheerio` 解析 MacMap 返回的 HTML，提取税率
4. 对比数据库最新一条同国家同 HS 编码记录：
   - 有变化：写入新记录（`changed=true`，记录 `prev_rate_pct`），生成 `tariff_change` alert（severity: high）
   - 无变化：更新 `fetched_at`，不生成 alert
5. 返回本次抓取结果摘要（多少条更新、多少条变化）

### 政策扫描（`/api/fetch/policies`）
1. Cron 每日 10:00 触发
2. 分别抓取商务部公告列表页和 WTO 通报页最新 20 条条目
3. 按发布时间去重（跳过已存在 URL）
4. 关键词匹配，命中则 `is_relevant=true`
5. 写入 `policies` 表，每条相关政策生成 `new_policy` alert（severity: medium）

---

## 六、页面结构

### `/` — 总览 Dashboard
- **Alert 横幅**：未读 alert 按 severity 高→低排列，点击标记已读
- **关键数字卡片**（3 个）：
  - CNY/AED 今日汇率 + 涨跌幅
  - 最近关税更新时间 + 是否有变化
  - 近 7 日新增相关政策数
- **汇率折线图**：近 30 日 CNY/AED（可切换其他货币对）
- 移动端：单列布局，卡片垂直堆叠

### `/exchange-rates` — 汇率详情
- 货币对切换 Tab（6 种）
- 折线图：7日 / 30日 / 90日 / 自定义区间
- 数据表格：日期、汇率、涨跌幅；超阈值行高亮
- 移动端：表格横向滚动

### `/tariffs` — 关税详情
- 国家筛选 + HS 编码筛选
- 数据表格：国家、HS 编码、当前税率、上次税率、变化幅度、生效日期；变化行高亮
- 右上角「手动更新关税」按钮，点击后显示 loading，完成后刷新数据
- 移动端：表格横向滚动

### `/policies` — 政策动态
- 时间线列表：发布时间、标题、来源、摘要、原文链接
- 筛选：按来源（商务部 / WTO）、按国家
- **政策与市场对比图**：以政策发布时间为标注点，叠加显示同期 CNY/AED 汇率曲线，观察政策发布前后市场反应
- 移动端：时间线单列，图表自适应宽度

---

## 七、移动端适配原则

- 所有页面使用 Tailwind 响应式前缀（`sm:` / `md:` / `lg:`）
- 多列网格在移动端折叠为单列（`grid-cols-1 md:grid-cols-3`）
- 图表组件使用 `ResponsiveContainer` 自适应父容器宽度
- 数据表格容器设置 `overflow-x-auto`，支持横向滚动
- 导航在移动端折叠为底部 Tab Bar 或汉堡菜单

---

## 八、配置项（`.env.local`）

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EXCHANGE_RATE_API_KEY=
RATE_SPIKE_THRESHOLD=0.5        # 汇率波动告警阈值（%）
```

---

## 九、迁移路径

| 阶段 | 状态 | 变更内容 |
|------|------|---------|
| Phase 1（当前） | 本地开发 | `node-cron` 定时任务，Supabase 云端数据库 |
| Phase 1.5 | 部署上线 | 推送到 Vercel，`vercel.json` 启用 Cron Jobs，`node-cron` 代码移除 |
| Phase 2 | 客户平台 | 增加用户认证（Supabase Auth）、推送渠道（微信/邮件）、客户自助查询页面 |

---

## 十、已知风险与应对

| 风险 | 说明 | 应对 |
|------|------|------|
| MacMap 为 JS 渲染页面 | `cheerio` 只解析静态 HTML，若 MacMap 数据由 JS 动态加载，抓取会失败 | 实现时优先尝试 MacMap 的 REST API 接口（有公开的查询参数规律）；若不可行则降级为 Playwright（需要时再引入，不提前加重依赖） |
| 商务部/WTO 网站结构变更 | 爬虫依赖页面 DOM 结构，上游改版可能导致解析失败 | 抓取失败时写入错误日志并生成 alert 提醒手动检查 |
| ExchangeRate-API 免费配额 | 免费套餐 1500 次/月，6 货币对每日一次 = 约 180 次/月，远低于上限 | 无需担心，有余量 |

---

## 十一、超出当前范围（Phase 2 规划）

- 用户登录与权限管理
- 微信企业号 / 邮件自动推送
- 客户自助查询与订阅偏好设置
- 多客户隔离（不同客户关注不同市场/HS 编码）
