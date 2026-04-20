# CCFI 中东运费映射设计

**目标**

使用上海航运交易所 `CCFI` 页面中的 `PERSIAN GULF/RED SEA SERVICE` 周度指数，构建一个不依赖付费 API 的中东运费压力数据源，并把指数变化映射为利润测算可消费的默认运费。

**边界**

- 该数据源只反映中东航线周度运费压力，不等于真实柜价。
- 利润测算继续读取 `freight_rates`，不改已有核心计算链路。
- 用户手工覆盖运费继续保留，优先级高于系统默认值。
- 首期仅覆盖当前系统已支持的 6 个航线/柜型组合：
  - `shanghai-jebel-ali-20gp`
  - `shanghai-jebel-ali-40gp`
  - `shanghai-jebel-ali-40hq`
  - `shanghai-dammam-20gp`
  - `shanghai-dammam-40gp`
  - `shanghai-dammam-40hq`

**方案**

1. 抓取上海航运交易所 `CCFI` 页面。
2. 解析页面中的：
   - 上期日期
   - 本期日期
   - `PERSIAN GULF/RED SEA SERVICE` 上期指数
   - `PERSIAN GULF/RED SEA SERVICE` 本期指数
3. 为每个支持的航线/柜型定义一个锚点：
   - `anchorIndex`
   - `anchorFreightCny`
4. 用下式推导默认运费：

```text
derivedFreightCny = anchorFreightCny × (currentIndex / anchorIndex)
```

5. 将推导结果写入现有 `freight_rates` 表，作为每周默认运费。

**为什么这样做**

- `CCFI` 页面真实可访问，不需要 key，不需要付费。
- `PERSIAN GULF/RED SEA SERVICE` 能稳定表达中东航线运费强弱变化。
- 现有利润计算、运费页面、首页图表都已围绕 `freight_rates` 搭好，继续喂这张表，改动最小。
- 这样能先把“运费变化影响利润”的链路跑通，不必等真实柜价 API。

**限制与处理**

- `CCFI` 是指数，不是柜型报价：
  - 处理方式：页面文案明确标注“指数映射默认运费”。
- 页面结构未来可能变动：
  - 处理方式：抓取器按航线名称文本定位，并补解析测试夹具。
- 只有周度数据：
  - 处理方式：运费模块维持周更，不伪装成日更。

**数据流**

1. `/api/fetch/freight`
2. 抓取 `CCFI` 页面
3. 解析中东航线指数
4. 用锚点价推导 6 个默认运费
5. upsert 到 `freight_rates`
6. 首页 `/`、二级页 `/freight`、利润测算 `/api/profit` 继续读取 `freight_rates`

**页面表达调整**

- 首页：
  - “中东基准运费” 改成 “中东默认运费”
  - 说明来源为 “CCFI 中东航线指数映射”
- 运费页：
  - 新增或强化说明：
    - 当前展示的是基于 `CCFI` 中东指数推导的默认运费
    - 只用于利润测算默认值
    - 不代表真实成交运费

**成功标准**

- 手动触发 `POST /api/fetch/freight` 可写入 `freight_rates`
- `/freight` 不再空白，能看到周度默认运费曲线
- 首页能显示最新默认运费
- `POST /api/profit` 在未手工覆盖运费时能读到最新默认运费
