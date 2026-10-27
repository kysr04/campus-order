# 校园奶茶点单站 Implementation Plan

> Static-site homework build. Verification is browser-based (no test runner, no git repo), so
> each task ends with a scripted check in a real browser instead of a unit-test cycle.

**Goal:** 一个手机/iPad 上可以直接演示的校园奶茶点单网站，能选规格、算价、进购物车、下单出取餐号。

**Architecture:** 6 个静态 HTML 页面 + 一个公共样式表 + 两个脚本。`data.js` 只放菜单数据，
`app.js` 负责购物车状态、价格计算与各页面渲染；购物车与历史订单存 localStorage。

**Tech Stack:** HTML5 + CSS3 + 原生 JavaScript（ES6）。无框架、无第三方库、无外部图片。

**Spec:** 本文件第一节（方案已在对话中确认：米白 + 焦糖 + 抹茶配色，6 页，购物车闭环）。

## Global Constraints

- 移动端优先：基准宽度 390px，桌面宽屏切换为「左菜单 + 右购物车」两栏。
- 所有可点目标不小于 44px；`touch-action: manipulation`；底部栏适配 `safe-area-inset-bottom`。
- 不依赖任何外部图片、字体或 CDN；饮品图用渐变色块 + emoji。
- 价格一律为整数元；优惠规则固定为「满 20 减 3」。
- localStorage 键名：`yd_cart`（购物车数组）、`yd_orders`（历史订单）、`yd_last_order`（最近一单）。
- 购物车行唯一键 = 饮品 id + 杯型 + 冰量 + 糖度 + 加料（排序后拼接）。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `index.html` | 点单首页：分类、饮品卡片、购物车入口 |
| `detail.html` | 饮品详情与规格选择、实时算价 |
| `cart.html` | 购物车：数量增减、备注、合计、提交 |
| `order.html` | 下单成功：取餐号、等待时间、明细 |
| `history.html` | 我的订单：历史订单列表 |
| `about.html` | 设计目的、技术说明、考核点对照 |
| `css/style.css` | 全站样式、响应式、动效 |
| `js/data.js` | 分类、规格、加料、14 款饮品 |
| `js/app.js` | 存储、购物车计算、各页面渲染与事件 |

---

## Task 1：数据与样式骨架

**Files:** Create `js/data.js`, `css/style.css`

- [ ] 写入 4 个分类、2 种杯型、4 种冰量、5 种糖度、5 种加料、14 款饮品。
- [ ] 定义设计变量：米白底 `--bg`、焦糖主色 `--brand`、抹茶点缀 `--matcha`。
- [ ] 写公共组件：卡片、按钮、chips、悬浮购物车条、桌面向导栏、toast、空状态。
- [ ] 写两档响应式：≤620px 单列 + 底部固定栏；≥900px 左右两栏。
- [ ] 检查：`node --check js/data.js` 通过。

## Task 2：购物车引擎

**Files:** Create `js/app.js`

- [ ] `lineKey()` 生成购物车行唯一键；相同规格再次加入只增加数量。
- [ ] `cartAdd/cartSetQty/cartRemove/cartClear` 四个写操作，每次写操作后同步 `yd_cart`。
- [ ] `cartTotals()` 返回 `{count, subtotal, discount, pay}`，满 20 减 3。
- [ ] `updateBadge()` 刷新所有页面的购物车角标。
- [ ] 检查：控制台手动调用 `cartAdd` 两次同款，确认 `count === 2` 且金额正确。

## Task 3：点单首页

**Files:** Create `index.html`

- [ ] 顶栏：品牌、点单/订单/关于导航、购物车按钮（带角标）。
- [ ] 优惠条、分类 chips、饮品卡片网格（渐变图 + 名称 + 描述 + 价格 + 快捷加号）。
- [ ] 点卡片进详情，点加号默认规格直接入车且不触发跳转。
- [ ] 移动端底部悬浮条显示件数与金额；桌面右侧显示购物车小结面板。
- [ ] 检查：点一次加号，角标与金额同步 +1。

## Task 4：详情与规格

**Files:** Create `detail.html`

- [ ] 读取 `?id=`，渲染渐变头图、名称、描述、标签。
- [ ] 杯型/冰量/糖度单选，加料多选，每次点击重算单价。
- [ ] 底部固定操作条显示当前单价与「加入购物车」。
- [ ] 不存在 id 时显示兜底页并可返回。
- [ ] 检查：中杯珍珠奶茶 + 大杯 + 珍珠，单价应为 12+3+3=18。

## Task 5：购物车页

**Files:** Create `cart.html`

- [ ] 渲染行项目：规格摘要、单价、数量步进器、行小计、删除。
- [ ] 数量减到 0 自动移除；备注输入保存到本单。
- [ ] 金额区显示商品金额、优惠、合计；未满 20 显示「再买 ¥X 减 3」。
- [ ] 提交生成订单：取餐号 `A` + 两位数、等待时间、写入 `yd_orders` 与 `yd_last_order`、清空购物车。
- [ ] 检查：满 20 时优惠为 3，合计正确；提交后购物车清空。

## Task 6：下单成功与历史订单

**Files:** Create `order.html`, `history.html`

- [ ] 成功页显示大号取餐号、等待时间、明细、两个出口按钮。
- [ ] 历史页按时间倒序列出订单，含单号、时间、摘要、实付。
- [ ] 两者都有空状态兜底。
- [ ] 检查：下单后成功页取餐号与历史页首条一致。

## Task 7：关于页与说明

**Files:** Create `about.html`, `README.md`

- [ ] 关于页：设计目的、功能清单、技术说明、考核点对照、作者占位。
- [ ] README：运行方式、目录结构、演示流程、改动指引。

## Task 8：真机尺寸验证

- [ ] 启动本地服务，按 390×844（手机）与 1024×768（iPad）逐页截图。
- [ ] 走完「加购 → 详情改规格 → 购物车改数量 → 提交 → 成功页 → 历史页」全流程。
- [ ] 确认无横向滚动、无遮挡、无控制台报错、金额计算正确。
- [ ] 截图存入 `screenshots/`。
