/* ==========================================================
   一杯 · 点单逻辑
   文件：js/app.js
   包含：本地存储、购物车增删改、金额与满减计算、
        首页/详情/购物车/下单成功/历史订单 五个页面的渲染
   ========================================================== */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const money = n => '¥' + Number(n).toFixed(0);

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  let toastTimer = null;
  function toast(msg) {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  /* ---------------- 本地存储 ---------------- */
  const KEY_CART = 'yd_cart';
  const KEY_ORDERS = 'yd_orders';
  const KEY_LAST = 'yd_last_order';
  const memory = {};

  const store = {
    get(key, def) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : def;
      } catch (e) {
        return memory[key] !== undefined ? memory[key] : def;
      }
    },
    set(key, val) {
      memory[key] = val;
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 内存兜底 */ }
    }
  };

  /* ---------------- 购物车模型 ---------------- */

  const getCart = () => store.get(KEY_CART, []);

  /* 同一款 + 同一规格才算同一行；加料排序后参与拼接 */
  function lineKey(id, size, ice, sugar, addons) {
    return [id, size, ice, sugar, addons.slice().sort().join('+')].join('|');
  }

  function saveCart(list) {
    store.set(KEY_CART, list);
    updateBadges();
  }

  function cartAdd(item) {
    const list = getCart();
    const key = lineKey(item.id, item.size, item.ice, item.sugar, item.addons);
    const hit = list.find(x => x.key === key);
    if (hit) {
      hit.qty += 1;
    } else {
      list.push({
        key: key,
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        grad: item.grad,
        size: item.size,
        sizeName: item.sizeName,
        ice: item.ice,
        iceName: item.iceName,
        sugar: item.sugar,
        sugarName: item.sugarName,
        addons: item.addons,
        addonNames: item.addonNames,
        unitPrice: item.unitPrice,
        qty: 1
      });
    }
    saveCart(list);
    return list;
  }

  function cartSetQty(key, qty) {
    let list = getCart();
    const hit = list.find(x => x.key === key);
    if (!hit) return;
    hit.qty = qty;
    if (hit.qty <= 0) list = list.filter(x => x.key !== key);
    saveCart(list);
  }

  function cartRemove(key) {
    saveCart(getCart().filter(x => x.key !== key));
  }

  function cartClear() {
    saveCart([]);
  }

  function cartTotals() {
    const list = getCart();
    const count = list.reduce((s, x) => s + x.qty, 0);
    const subtotal = list.reduce((s, x) => s + x.unitPrice * x.qty, 0);
    const discount = subtotal >= DISCOUNT.threshold ? DISCOUNT.amount : 0;
    return { count: count, subtotal: subtotal, discount: discount, pay: subtotal - discount };
  }

  /* 角标：所有页面的购物车按钮共用 */
  function updateBadges() {
    const { count } = cartTotals();
    $$('.js-cart-badge').forEach(el => {
      el.textContent = count > 99 ? '99+' : count;
      el.classList.toggle('show', count > 0);
    });
  }

  /* ---------------- 公共页头 ---------------- */
  function initHeader() {
    const page = document.body.dataset.page;
    $$('.main-nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (page && href.indexOf(page + '.html') > -1) a.classList.add('active');
    });
    $$('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  function formatTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = n => (n < 10 ? '0' + n : '' + n);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- 购物车摘要（首页两处共用） ---------------- */
  function summaryHTML() {
    const list = getCart();
    const t = cartTotals();
    if (!list.length) {
      return '<div class="mini-item"><span class="muted">还没有选饮品</span></div>';
    }
    const shown = list.slice(0, 4);
    let html = shown.map(function (it) {
      return '<div class="mini-item">' +
        '<div class="dot ' + it.grad + '">' + it.emoji + '</div>' +
        '<div class="n"><b>' + esc(it.name) + ' × ' + it.qty + '</b>' +
          '<span>' + esc(it.sizeName) + ' · ' + esc(it.iceName) + ' · ' + esc(it.sugarName) + '</span></div>' +
        '<b>' + money(it.unitPrice * it.qty) + '</b>' +
      '</div>';
    }).join('');
    if (list.length > 4) {
      html += '<div class="mini-item"><span class="muted">还有 ' + (list.length - 4) + ' 种饮品…</span></div>';
    }
    return html + '<div class="row-line" style="margin-top:6px"><span>共 ' + t.count + ' 件</span>' +
      '<b>' + money(t.subtotal) + '</b></div>';
  }

  function renderHomeCart() {
    const t = cartTotals();

    const barSum = $('#barSum');
    if (barSum) barSum.textContent = money(t.pay);
    const barHint = $('#barHint');
    if (barHint) {
      barHint.textContent = t.count
        ? (t.discount ? '已优惠 ' + money(t.discount) + ' · 共 ' + t.count + ' 件' : '共 ' + t.count + ' 件 · 满 20 减 3')
        : '还没选饮品';
    }
    const barBtn = $('#barCheckout');
    if (barBtn) {
      barBtn.style.opacity = t.count ? '1' : '.45';
      barBtn.style.pointerEvents = t.count ? 'auto' : 'none';
    }

    const panel = $('#cartPanel');
    if (panel) {
      $('#panelCount').textContent = t.count;
      $('#panelItems').innerHTML = summaryHTML();
      $('#panelTotals').innerHTML =
        '<div class="row-line"><span>商品金额</span><b>' + money(t.subtotal) + '</b></div>' +
        (t.discount ? '<div class="row-line discount"><span>满 20 减 3</span><b>-' + money(t.discount) + '</b></div>' : '') +
        '<div class="row-line total"><span>合计</span><b>' + money(t.pay) + '</b></div>' +
        '<a class="btn btn-primary btn-block" href="cart.html" style="margin-top:10px"' +
          (t.count ? '' : ' aria-disabled="true"') + '>去结算</a>';
    }
  }

  /* ---------------- 首页 ---------------- */
  function initIndex() {
    let currentCat = 'all';

    const chips = $('#chips');
    chips.innerHTML = CATEGORIES.map(c =>
      '<button class="chip" data-cat="' + c.key + '">' + c.emoji + ' ' + c.name + '</button>'
    ).join('');

    function paintChips() {
      $$('.chip', chips).forEach(c => c.classList.toggle('active', c.dataset.cat === currentCat));
    }

    function renderDrinks() {
      const list = currentCat === 'all'
        ? DRINKS
        : DRINKS.filter(d => d.cat === currentCat);

      $('#drinkGrid').innerHTML = list.map(function (d, i) {
        return '<article class="drink-card" style="--i:' + i + '">' +
          '<div class="drink-thumb ' + d.grad + '">' +
            '<div class="tile-tags">' + d.tags.map(t =>
              '<span class="tag ' + (t === '招牌' || t === '推荐' ? 'tag-hot' : 'tag-new') + '">' + t + '</span>'
            ).join('') + '</div>' +
            '<span>' + d.emoji + '</span>' +
          '</div>' +
          '<div class="drink-body">' +
            '<div class="drink-name">' + esc(d.name) + '</div>' +
            '<div class="drink-desc">' + esc(d.desc) + '</div>' +
            '<div class="drink-foot">' +
              '<span class="price"><i>¥</i>' + d.price + '</span>' +
              '<button class="add-btn" data-add="' + d.id + '" aria-label="加入购物车">＋</button>' +
            '</div>' +
          '</div>' +
          '<a class="card-link" href="detail.html?id=' + d.id + '" aria-label="查看 ' + esc(d.name) + '"></a>' +
        '</article>';
      }).join('');
    }

    chips.addEventListener('click', function (e) {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      currentCat = btn.dataset.cat;
      paintChips();
      renderDrinks();
    });

    /* 快捷加购：默认中杯 / 少冰 / 五分糖 / 不加料 */
    $('#drinkGrid').addEventListener('click', function (e) {
      const btn = e.target.closest('.add-btn');
      if (!btn) return;
      e.preventDefault();
      const d = findDrink(btn.dataset.add);
      if (!d) return;
      const size = SIZES[0];
      const ice = ICES[1];
      const sugar = SUGARS[2];
      cartAdd({
        id: d.id, name: d.name, emoji: d.emoji, grad: d.grad,
        size: size.key, sizeName: size.name,
        ice: ice.key, iceName: ice.name,
        sugar: sugar.key, sugarName: sugar.name,
        addons: [], addonNames: [],
        unitPrice: d.price + size.extra
      });
      renderHomeCart();
      toast('已加入购物车：' + d.name);
      const badge = $('.js-cart-badge');
      if (badge) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
    });

    paintChips();
    renderDrinks();
    renderHomeCart();
  }

  /* ---------------- 详情页 ---------------- */
  function initDetail() {
    const root = $('#detailRoot');
    if (!root) return;

    const id = new URLSearchParams(location.search).get('id');
    const d = findDrink(id);
    if (!d) {
      root.innerHTML = '<div class="empty"><span class="emoji">🥤</span>' +
        '<h3>这款饮品下架了</h3><p>去菜单里看看别的吧</p>' +
        '<a class="btn btn-primary" href="index.html">回到点单</a></div>';
      $('#detailAction').style.display = 'none';
      return;
    }

    const state = { size: 'm', ice: 'less', sugar: 'half', addons: [] };

    document.title = d.name + ' - 一杯';
    $('#heroEmoji').textContent = d.emoji;
    $('#detailHero').className = 'detail-hero ' + d.grad;
    $('#detailTitle').textContent = d.name;
    $('#detailDesc').textContent = d.desc;
    $('#detailTags').innerHTML = d.tags.map(t =>
      '<span class="tag ' + (t === '招牌' || t === '推荐' ? 'tag-hot' : 'tag-new') + '">' + t + '</span>'
    ).join('');

    const priceOf = () => {
      const size = SIZES.find(s => s.key === state.size);
      const addonSum = state.addons.reduce((s, k) => {
        const a = ADDONS.find(x => x.key === k);
        return s + (a ? a.price : 0);
      }, 0);
      return d.price + size.extra + addonSum;
    };

    function paintPrice() {
      $('#priceValue').textContent = priceOf();
    }

    $('#sizes').innerHTML = SIZES.map(s =>
      '<button class="opt-btn' + (s.key === state.size ? ' active' : '') + '" data-size="' + s.key + '">' +
        s.name + (s.extra ? ' +' + money(s.extra) : '') + '</button>'
    ).join('');

    $('#ices').innerHTML = ICES.map(i =>
      '<button class="opt-btn' + (i.key === state.ice ? ' active' : '') + '" data-ice="' + i.key + '">' +
        i.name + '</button>'
    ).join('');

    $('#sugars').innerHTML = SUGARS.map(s =>
      '<button class="opt-btn' + (s.key === state.sugar ? ' active' : '') + '" data-sugar="' + s.key + '">' +
        s.name + '</button>'
    ).join('');

    $('#addons').innerHTML = ADDONS.map(a =>
      '<button class="addon-btn' + (state.addons.indexOf(a.key) > -1 ? ' active' : '') +
        '" data-addon="' + a.key + '">' + a.name + ' <small>+' + money(a.price) + '</small></button>'
    ).join('');

    function repaint(groupSel, attr, value) {
      $$(groupSel + ' .opt-btn').forEach(b => b.classList.toggle('active', b.dataset[attr] === value));
    }

    root.addEventListener('click', function (e) {
      const b = e.target.closest('[data-size],[data-ice],[data-sugar],[data-addon]');
      if (!b) return;
      if (b.dataset.size) { state.size = b.dataset.size; repaint('#sizes', 'size', state.size); }
      if (b.dataset.ice) { state.ice = b.dataset.ice; repaint('#ices', 'ice', state.ice); }
      if (b.dataset.sugar) { state.sugar = b.dataset.sugar; repaint('#sugars', 'sugar', state.sugar); }
      if (b.dataset.addon) {
        const k = b.dataset.addon;
        const i = state.addons.indexOf(k);
        if (i > -1) state.addons.splice(i, 1); else state.addons.push(k);
        b.classList.toggle('active', state.addons.indexOf(k) > -1);
      }
      paintPrice();
    });

    $('#btnAdd').addEventListener('click', function () {
      const size = SIZES.find(s => s.key === state.size);
      const ice = ICES.find(s => s.key === state.ice);
      const sugar = SUGARS.find(s => s.key === state.sugar);
      cartAdd({
        id: d.id, name: d.name, emoji: d.emoji, grad: d.grad,
        size: size.key, sizeName: size.name,
        ice: ice.key, iceName: ice.name,
        sugar: sugar.key, sugarName: sugar.name,
        addons: state.addons.slice(),
        addonNames: state.addons.map(k => (ADDONS.find(a => a.key === k) || {}).name).filter(Boolean),
        unitPrice: priceOf()
      });
      updateBadges();
      const btn = this;
      btn.textContent = '✓ 已加入购物车';
      setTimeout(function () { btn.textContent = '加入购物车'; }, 1200);
      toast('已加入购物车');
    });

    $('#detailAction').style.display = '';
    paintPrice();
  }

  /* ---------------- 购物车页 ---------------- */
  function initCart() {
    const listEl = $('#cartList');
    if (!listEl) return;

    function render() {
      const list = getCart();
      const t = cartTotals();

      if (!list.length) {
        listEl.innerHTML = '<div class="empty"><span class="emoji">🧋</span>' +
          '<h3>购物车还是空的</h3><p>去挑一杯吧，满 20 减 3</p>' +
          '<a class="btn btn-primary" href="index.html">去点单</a></div>';
        $('#cartTotals').innerHTML = '';
        $('#btnCheckout').style.opacity = '.45';
        $('#btnCheckout').style.pointerEvents = 'none';
        $('#checkoutSum').textContent = money(0);
        $('#checkoutHint').textContent = '还没选饮品';
        return;
      }

      listEl.innerHTML = list.map(function (it, i) {
        const optText = [it.sizeName, it.iceName, it.sugarName]
          .concat(it.addonNames || []).join(' · ');
        return '<div class="cart-item" style="--i:' + i + '">' +
          '<div class="cart-thumb ' + it.grad + '">' + it.emoji + '</div>' +
          '<div class="cart-main">' +
            '<h3>' + esc(it.name) + '</h3>' +
            '<div class="opts">' + esc(optText) + '</div>' +
            '<div class="foot">' +
              '<span class="price"><i>¥</i>' + (it.unitPrice * it.qty) + '</span>' +
              '<div class="qty">' +
                '<button data-dec="' + esc(it.key) + '" aria-label="减少">−</button>' +
                '<b>' + it.qty + '</b>' +
                '<button data-inc="' + esc(it.key) + '" aria-label="增加">＋</button>' +
              '</div>' +
            '</div>' +
            '<div style="text-align:right"><button class="del-btn" data-del="' + esc(it.key) + '">删除</button></div>' +
          '</div>' +
        '</div>';
      }).join('');

      $('#cartTotals').innerHTML =
        '<div class="row-line"><span>商品金额</span><b>' + money(t.subtotal) + '</b></div>' +
        (t.discount
          ? '<div class="row-line discount"><span>满 ' + DISCOUNT.threshold + ' 减 ' + DISCOUNT.amount + '</span><b>-' + money(t.discount) + '</b></div>'
          : '<div class="row-line"><span>再买 ' + money(DISCOUNT.threshold - t.subtotal) + ' 可减 ' + DISCOUNT.amount + '</span><b>—</b></div>') +
        '<div class="row-line total"><span>合计</span><b>' + money(t.pay) + '</b></div>';

      $('#checkoutSum').textContent = money(t.pay);
      $('#checkoutHint').textContent = '共 ' + t.count + ' 件' + (t.discount ? ' · 已优惠 ' + money(t.discount) : '');
      $('#btnCheckout').style.opacity = '1';
      $('#btnCheckout').style.pointerEvents = 'auto';
    }

    listEl.addEventListener('click', function (e) {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const del = e.target.closest('[data-del]');
      if (inc) {
        const it = getCart().find(x => x.key === inc.dataset.inc);
        if (it) cartSetQty(it.key, it.qty + 1);
        render();
      } else if (dec) {
        const it = getCart().find(x => x.key === dec.dataset.dec);
        if (it) cartSetQty(it.key, it.qty - 1);
        render();
      } else if (del) {
        cartRemove(del.dataset.del);
        toast('已删除');
        render();
      }
    });

    $('#btnCheckout').addEventListener('click', function () {
      const list = getCart();
      if (!list.length) return;
      const t = cartTotals();
      const orders = store.get(KEY_ORDERS, []);
      const no = 'A' + String(10 + (orders.length % 89)).padStart(2, '0');
      const order = {
        no: no,
        items: list,
        note: ($('#noteInput').value || '').trim(),
        count: t.count,
        subtotal: t.subtotal,
        discount: t.discount,
        pay: t.pay,
        wait: Math.min(25, 5 + t.count * 2),
        createdAt: new Date().toISOString()
      };
      orders.unshift(order);
      store.set(KEY_ORDERS, orders);
      store.set(KEY_LAST, order);
      cartClear();
      location.href = 'order.html';
    });

    render();
  }

  /* ---------------- 下单成功 ---------------- */
  function initOrder() {
    const root = $('#orderRoot');
    if (!root) return;
    const o = store.get(KEY_LAST, null);
    if (!o) {
      root.innerHTML = '<div class="empty"><span class="emoji">🧾</span>' +
        '<h3>还没有订单</h3><p>先去点一杯吧</p>' +
        '<a class="btn btn-primary" href="index.html">去点单</a></div>';
      return;
    }

    const items = o.items.map(it =>
      '<div class="row-line"><span>' + esc(it.name) + ' × ' + it.qty + '</span><b>' +
        money(it.unitPrice * it.qty) + '</b></div>'
    ).join('');

    root.innerHTML =
      '<div class="success-wrap">' +
        '<div class="success-icon">🎉</div>' +
        '<h1>下单成功</h1>' +
        '<p class="sub">请留意取餐叫号，做好会通知你</p>' +
        '<div class="takeaway">' +
          '<div class="k">取 餐 号</div>' +
          '<div class="no">' + esc(o.no) + '</div>' +
          '<div class="wait">预计等待 ' + o.wait + ' 分钟 · 共 ' + o.count + ' 件</div>' +
        '</div>' +
        '<div class="order-card" style="text-align:left">' +
          '<div class="top"><span class="no">订单明细</span><span class="time">' +
            formatTime(o.createdAt) + '</span></div>' +
          '<div class="items">' + items +
            (o.discount ? '<div class="row-line discount"><span>满减优惠</span><b>-' + money(o.discount) + '</b></div>' : '') +
            '<div class="row-line total"><span>实付</span><b>' + money(o.pay) + '</b></div>' +
            (o.note ? '<div class="sub" style="margin-top:6px">备注：' + esc(o.note) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:18px">' +
          '<a class="btn btn-primary btn-block" href="index.html">继续点单</a>' +
          '<a class="btn btn-ghost btn-block" href="history.html">我的订单</a>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- 历史订单 ---------------- */
  function initHistory() {
    const listEl = $('#historyList');
    if (!listEl) return;
    const orders = store.get(KEY_ORDERS, []);

    if (!orders.length) {
      listEl.innerHTML = '<div class="empty"><span class="emoji">🧾</span>' +
        '<h3>还没有订单</h3><p>点一杯试试，下单后会出现在这里</p>' +
        '<a class="btn btn-primary" href="index.html">去点单</a></div>';
      return;
    }

    listEl.innerHTML = orders.map(function (o) {
      const summary = o.items.map(it => it.name + '×' + it.qty).join('、');
      return '<div class="order-card">' +
        '<div class="top"><span class="no">' + esc(o.no) + '</span>' +
          '<span class="time">' + formatTime(o.createdAt) + '</span></div>' +
        '<div class="items">' + esc(summary) + '</div>' +
        (o.note ? '<div class="sub" style="margin-top:4px">备注：' + esc(o.note) + '</div>' : '') +
        '<div class="bottom"><span class="sub">共 ' + o.count + ' 件 · 取餐号 ' + esc(o.no) + '</span>' +
          '<b class="price">' + money(o.pay) + '</b></div>' +
      '</div>';
    }).join('');
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    initHeader();
    updateBadges();
    switch (document.body.dataset.page) {
      case 'index':   initIndex();   break;
      case 'detail':  initDetail();  break;
      case 'cart':    initCart();    break;
      case 'order':   initOrder();   break;
      case 'history': initHistory(); break;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
