/* ==========================================================
   一杯 · 菜单数据
   文件：js/data.js
   说明：分类、规格、加料与 14 款饮品。真实项目应由后端返回，
        课程作业写成静态数据最直观，改菜单只动这一个文件。
   ========================================================== */

const CATEGORIES = [
  { key: 'all',    name: '全部',     emoji: '🧋' },
  { key: 'milk',   name: '奶茶',     emoji: '🧋' },
  { key: 'fruit',  name: '果茶',     emoji: '🍑' },
  { key: 'coffee', name: '咖啡',     emoji: '☕' },
  { key: 'side',   name: '小料杯',   emoji: '🍮' }
];

const SIZES = [
  { key: 'm', name: '中杯', extra: 0 },
  { key: 'l', name: '大杯', extra: 3 }
];

const ICES = [
  { key: 'normal', name: '正常冰' },
  { key: 'less',   name: '少冰' },
  { key: 'none',   name: '去冰' },
  { key: 'hot',    name: '热饮' }
];

const SUGARS = [
  { key: 'full',   name: '全糖' },
  { key: 'seven',  name: '七分糖' },
  { key: 'half',   name: '五分糖' },
  { key: 'three',  name: '三分糖' },
  { key: 'none',   name: '无糖' }
];

const ADDONS = [
  { key: 'pearl',   name: '珍珠', price: 3 },
  { key: 'coconut', name: '椰果', price: 3 },
  { key: 'taro',    name: '芋泥', price: 5 },
  { key: 'foam',    name: '奶盖', price: 6 },
  { key: 'pudding', name: '布丁', price: 4 }
];

/* 每款饮品：price 是中杯基础价；grad 决定封面渐变 */
const DRINKS = [
  { id: 1,  name: '招牌珍珠奶茶', cat: 'milk',   price: 12, emoji: '🧋', grad: 'grad-1', desc: '手煮黑糖珍珠，奶香浓', tags: ['招牌'], hot: true },
  { id: 2,  name: '芋泥波波奶茶', cat: 'milk',   price: 16, emoji: '🧋', grad: 'grad-2', desc: '现打芋泥 + 波波珠', tags: ['推荐'], hot: true },
  { id: 3,  name: '黑糖鲜奶',     cat: 'milk',   price: 14, emoji: '🥛', grad: 'grad-3', desc: '不加茶底，纯奶香', tags: [] },
  { id: 4,  name: '焦糖烤奶',     cat: 'milk',   price: 13, emoji: '🍮', grad: 'grad-1', desc: '表面焦糖，微苦回甘', tags: [] },
  { id: 5,  name: '杨枝甘露',     cat: 'fruit',  price: 18, emoji: '🥭', grad: 'grad-4', desc: '芒果 + 西柚 + 椰浆', tags: ['招牌'], hot: true },
  { id: 6,  name: '满杯百香果',   cat: 'fruit',  price: 15, emoji: '🍋', grad: 'grad-5', desc: '酸甜开胃，果肉很足', tags: [] },
  { id: 7,  name: '多肉葡萄',     cat: 'fruit',  price: 19, emoji: '🍇', grad: 'grad-2', desc: '整颗葡萄果肉，清爽', tags: ['推荐'], hot: true },
  { id: 8,  name: '手打柠檬茶',   cat: 'fruit',  price: 12, emoji: '🍋', grad: 'grad-5', desc: '现捶柠檬，微酸解腻', tags: [] },
  { id: 9,  name: '生椰拿铁',     cat: 'coffee', price: 16, emoji: '☕', grad: 'grad-3', desc: '椰乳配浓缩，顺滑不苦', tags: ['招牌'], hot: true },
  { id: 10, name: '冰美式',       cat: 'coffee', price: 12, emoji: '☕', grad: 'grad-3', desc: '清爽提神，自习必备', tags: [] },
  { id: 11, name: '香草拿铁',     cat: 'coffee', price: 15, emoji: '☕', grad: 'grad-2', desc: '奶泡绵密，微甜', tags: [] },
  { id: 12, name: '芋泥小料杯',   cat: 'side',   price: 8,  emoji: '🍠', grad: 'grad-2', desc: '只要芋泥和珍珠', tags: ['新品'] },
  { id: 13, name: '布丁小料杯',   cat: 'side',   price: 7,  emoji: '🍮', grad: 'grad-1', desc: '现做布丁，Q 弹', tags: [] },
  { id: 14, name: '珍珠小料杯',   cat: 'side',   price: 6,  emoji: '🫘', grad: 'grad-4', desc: '黑糖珍珠单点', tags: [] }
];

/* 满减规则 */
const DISCOUNT = { threshold: 20, amount: 3 };

function findDrink(id) {
  return DRINKS.find(function (d) { return d.id === Number(id); }) || null;
}

function catOf(key) {
  return CATEGORIES.find(function (c) { return c.key === key; }) || CATEGORIES[0];
}
