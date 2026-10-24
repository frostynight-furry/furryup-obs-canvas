'use strict';
(() => {
  const api = window.FurryUPCanvasHost, model = window.FurryUPObsLayout, $ = id => document.getElementById(id);
  if (!api?.applyObsLayout || !model || !$('obs-layout-editor')) return;
  const i18n = window.FurryUPUIBindings || { t: value => value, assign:(node,key,read) => { node[key] = read(); } };
  const text = (node, read) => i18n.assign(node, 'textContent', () => i18n.t(typeof read === 'function' ? read() : read));
  const clone = value => JSON.parse(JSON.stringify(value));
  const drafts = {}, saved = {}, undo = { landscape:[], portrait:[] }, nodes = new Map();
  let orientation = 'landscape', selected = 'songs', snapshot = null, busy = false, scale = 1, moving = false, active = true;
  let appearanceSignature = '';
  let layerDrag = null;
  const profile = () => drafts[orientation], selectedItem = () => profile()?.modules.find(item => item.id === selected);
  const dirty = key => JSON.stringify(drafts[key]?.modules) !== JSON.stringify(saved[key]?.modules);
  const tell = (message, error = false) => { text($('layout-status'), message); $('layout-status').dataset.error = String(error); };
  const remember = () => { undo[orientation].push(clone(profile())); if (undo[orientation].length > 50) undo[orientation].shift(); };
  function previewUrl(id) {
    const route = id === 'poll' ? 'canvas-poll-preview' : model.routes[id];
    const url = new URL(route, snapshot.outputUrl);
    url.searchParams.set('token', new URL(snapshot.outputUrl).searchParams.get('token'));
    url.searchParams.set('preview', '1'); return url.href;
  }
  function appearance(frame) {
    if (frame?.contentWindow && snapshot?.outputUrl) frame.contentWindow.postMessage({ kind:'layout-preview-appearance', appearance:snapshot.settings.appearance }, new URL(snapshot.outputUrl).origin);
  }
  function fit() {
    if (!active) return;
    const wrap = $('layout-stage-wrap'), style = getComputedStyle(wrap);
    const size = model.sizes[orientation], available = Math.max(1, wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const maxHeight = Math.max(280, innerHeight - ($('obs-layout-editor').classList.contains('layout-expanded') ? 230 : 380));
    scale = Math.min(available / size.width, maxHeight / size.height);
    Object.assign($('layout-stage-space').style, { width:size.width*scale+'px', height:size.height*scale+'px' });
    Object.assign($('layout-stage').style, { width:size.width+'px', height:size.height+'px', transform:`scale(${scale})` });
    $('layout-stage').style.setProperty('--layout-scale', String(scale));
  }
  function controls() {
    if (!profile()) return;
    const item = selectedItem(), changed = dirty(orientation);
    for (const input of $('layout-properties').querySelectorAll('input')) {
      if (document.activeElement !== input) input.value = item?.[input.dataset.layoutField] ?? '';
      input.disabled = busy || !item || item.locked;
    }
    text($('layout-selected-title'), () => model.names[selected]);
    text($('layout-draft-state'), changed ? '布局未应用' : '已应用到直播');
    $('layout-apply').disabled = busy || moving || !changed; $('layout-undo').disabled = busy || moving || !undo[orientation].length;
    $('layout-reload').disabled = busy || moving; $('layout-reset').disabled = busy || moving;
    $('layout-copy').disabled = busy || !snapshot?.canvasUrls?.[orientation];
    for (const button of document.querySelectorAll('[data-layout-orientation]')) { button.disabled = busy; button.setAttribute('aria-pressed', String(button.dataset.layoutOrientation === orientation)); }
    const size = model.sizes[orientation]; text($('layout-size'), `${size.width} × ${size.height}`);
    const ordered = model.stack(profile()), position = ordered.findIndex(row => row.id === selected);
    if (!layerDrag && ordered.some((current,index) => $('layout-layers').children[index]?.dataset.module !== current.id)) {
      const focused = document.activeElement;
      for (const current of ordered) $('layout-layers').append(document.querySelector(`#layout-layers [data-module="${current.id}"]`));
      if (focused?.closest('#layout-layers')) focused.focus({ preventScroll:true });
    }
    for (const button of document.querySelectorAll('[data-layer-action]')) {
      const atEdge = ['top','up'].includes(button.dataset.layerAction) ? position === 0 : position === ordered.length - 1;
      button.disabled = busy || moving || !item || item.locked || atEdge;
    }
    for (const row of $('layout-layers').children) {
      const current = profile().modules.find(item => item.id === row.dataset.module);
      row.querySelector('.layout-layer-select').setAttribute('aria-pressed', String(current.id === selected));
      row.querySelector('.layout-layer-handle').disabled = busy || current.locked;
      row.dataset.locked = String(current.locked);
      row.querySelector('[data-field=visible]').checked = current.visible;
      row.querySelector('[data-field=locked]').checked = current.locked;
      for (const input of row.querySelectorAll('input')) input.disabled = busy || moving;
    }
  }
  function render() {
    if (!profile()) return;
    controls(); fit();
    for (const item of profile().modules) {
      let node = nodes.get(item.id);
      if (!active || !item.visible || !snapshot?.outputUrl) { if (node) { node.remove(); nodes.delete(item.id); } continue; }
      if (!node) {
        node = document.createElement('div'); node.className = 'layout-block'; node.dataset.module = item.id;
        const frame = document.createElement('iframe'); frame.title = model.names[item.id] + '布局示例'; frame.tabIndex = -1; frame.src = previewUrl(item.id);
        frame.addEventListener('load', () => appearance(frame));
        const label = document.createElement('span'); label.className = 'layout-block-label'; text(label, () => model.names[item.id]);
        const handle = document.createElement('span'); handle.className = 'layout-resize'; handle.setAttribute('aria-hidden', 'true');
        node.append(frame, label, handle); $('layout-stage').append(node); nodes.set(item.id, node);
        node.addEventListener('pointerdown', () => { if (!busy && !profile().modules.find(row => row.id === item.id)?.locked) { selected = item.id; render(); } });
      }
      node.dataset.selected = String(item.id === selected); node.dataset.locked = String(item.locked);
      Object.assign(node.style, { left:item.x+'px', top:item.y+'px', width:item.width+'px', height:item.height+'px', zIndex:String(item.layer) });
    }
  }
  function update(id, change, history = true) {
    if (busy || !profile()) return;
    if (history) remember();
    profile().modules = profile().modules.map(item => item.id === id ? model.bound({ ...item, ...change }, orientation) : item);
    render();
  }
  function reorder(id, destination) {
    if (busy || !profile()) return;
    const next = model.reorder(profile(), id, destination);
    if (next === profile()) return;
    remember(); drafts[orientation] = next; selected = id;
    tell('层级已调整，点击「应用到直播」生效。'); render();
  }
  for (const id of model.modules) {
    const row = document.createElement('li'); row.dataset.module = id;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary layout-layer-select'; text(button, () => model.names[id]);
    button.onclick = () => { if (!moving) { selected = id; render(); } };
    const handle = document.createElement('button'); handle.type = 'button'; handle.className = 'secondary layout-layer-handle'; handle.textContent = '⠿';
    i18n.assign(handle, 'title', () => i18n.t('拖动调整层级；方向键上移或下移，Home 置顶，End 置底'));
    i18n.assign(handle, 'ariaLabel', () => `${i18n.t('调整层级')}：${i18n.t(model.names[id])}`);
    handle.onkeydown = event => {
      if (busy || moving || !['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
      event.preventDefault(); const ordered = model.stack(profile()), index = ordered.findIndex(item => item.id === id);
      reorder(id, event.key === 'Home' ? 0 : event.key === 'End' ? ordered.length - 1 : index + (event.key === 'ArrowUp' ? -1 : 1)); handle.focus();
    };
    row.append(button, handle);
    for (const [field, title] of [['visible','显示'],['locked','锁定']]) {
      const label = document.createElement('label'), input = document.createElement('input'), caption = document.createElement('span');
      input.type = 'checkbox'; input.dataset.field = field; text(caption,title); label.append(input,caption); row.append(label);
      input.onchange = () => update(id, { [field]:input.checked });
    }
    $('layout-layers').append(row);
  }
  for (const button of document.querySelectorAll('[data-layer-action]')) button.onclick = () => {
    if (busy || moving) return;
    const ordered = model.stack(profile()), index = ordered.findIndex(item => item.id === selected), action = button.dataset.layerAction;
    reorder(selected, action === 'top' ? 0 : action === 'bottom' ? ordered.length - 1 : index + (action === 'up' ? -1 : 1));
  };
  function endLayerDrag(cancel = false) {
    if (!layerDrag) return;
    const { id, destination } = layerDrag;
    layerDrag = null; moving = false;
    for (const row of $('layout-layers').children) { delete row.dataset.dragging; delete row.dataset.drop; }
    if (!cancel) reorder(id, destination);
    render();
  }
  window.interact('#layout-layers li').draggable({ allowFrom:'.layout-layer-handle', autoScroll:true, listeners:{
    start:event => {
      const id = event.target.dataset.module, ordered = profile() && model.stack(profile()), index = ordered?.findIndex(item => item.id === id);
      if (busy || moving || index == null || index < 0 || ordered[index].locked) { event.interaction.stop(); return; }
      selected = id; moving = true; layerDrag = { id, destination:index }; event.target.dataset.dragging = 'true'; controls();
    },
    move:event => {
      if (!layerDrag) return;
      const rows = [...$('layout-layers').children].filter(row => row.dataset.module !== layerDrag.id);
      let index = rows.findIndex(row => { const rect = row.getBoundingClientRect(); return event.clientY < rect.top + rect.height / 2; });
      if (index < 0) index = rows.length;
      layerDrag.destination = index;
      for (const row of $('layout-layers').children) delete row.dataset.drop;
      if (index < rows.length) rows[index].dataset.drop = 'before'; else rows.at(-1).dataset.drop = 'after';
    },
    end:event => endLayerDrag(event.type === 'dragcancel' || event.originalEvent?.type === 'pointercancel')
  } });
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && layerDrag) { endLayerDrag(true); } });
  for (const button of document.querySelectorAll('[data-layout-orientation]')) button.onclick = () => {
    if (busy || moving) return;
    orientation = button.dataset.layoutOrientation;
    for (const node of nodes.values()) node.remove(); nodes.clear();
    tell('两种方向分别保存；编辑只影响预览，应用后才更新直播。'); render();
  };
  for (const input of $('layout-properties').querySelectorAll('input')) input.onchange = () => {
    const item = selectedItem(), value = Number(input.value); if (!item || item.locked || !Number.isFinite(value)) { render(); return; }
    const field = input.dataset.layoutField;
    update(selected, { [field]: field === 'layer' ? Math.min(20, Math.max(0, Math.round(value))) : value });
  };
  $('layout-undo').onclick = () => { if (!busy && undo[orientation].length) { drafts[orientation] = undo[orientation].pop(); render(); } };
  $('layout-reload').onclick = () => { if (!busy) { remember(); drafts[orientation] = clone(saved[orientation]); tell('已载入当前直播布局'); render(); } };
  $('layout-reset').onclick = () => { if (!busy) { remember(); drafts[orientation] = { ...model.preset(orientation), revision:saved[orientation].revision }; tell('默认布局已放入预览，应用后生效'); render(); } };
  $('layout-expand').onclick = () => { $('obs-layout-editor').classList.toggle('layout-expanded'); fit(); };
  $('layout-copy').onclick = async () => {
    try { await api.copy('canvas-'+orientation); tell('合成源已复制，请按当前尺寸添加到 OBS 浏览器源。'); }
    catch { tell('复制失败，请等待工作台就绪后重试。',true); }
  };
  $('layout-apply').onclick = async () => {
    if (busy || moving || !dirty(orientation)) return;
    const target = orientation, request = { orientation:target, baseRevision:drafts[target].revision, profile:clone(profile()) };
    busy = true; render();
    try {
      const result = await api.applyObsLayout(request);
      saved[target] = clone(result.settings.obsLayout.profiles[target]); drafts[target] = clone(saved[target]); undo[target] = [];
      tell('布局已应用到直播');
    } catch { tell('应用失败；若布局已在其他窗口更新，请载入直播布局后重试。',true); }
    finally { busy = false; render(); }
  };
  function begin(event) {
    const id = event.target.dataset.module, item = profile().modules.find(row => row.id === id);
    if (busy || item?.locked) { event.interaction.stop(); return; }
    selected = id; remember(); moving = true;
  }
  window.interact('.layout-block').draggable({ ignoreFrom:'.layout-resize', listeners:{ start:begin, move:event => {
    if (!moving || busy) return; const item = selectedItem(); update(item.id, { x:item.x+event.dx/scale, y:item.y+event.dy/scale }, false);
  }, end:() => { moving=false; const item=selectedItem(); if ($('layout-snap').checked && item) update(item.id,{x:Math.round(item.x/10)*10,y:Math.round(item.y/10)*10},false); render(); } } })
    .resizable({ edges:{ right:'.layout-resize', bottom:'.layout-resize' }, listeners:{ start:begin, move:event => {
      if (!moving || busy) return; const item=selectedItem(); update(item.id,{width:item.width+event.deltaRect.width/scale,height:item.height+event.deltaRect.height/scale},false);
    }, end:() => { moving=false; render(); } } });
  function receive(state) {
    snapshot = state; const next = model.normalize(state.settings?.obsLayout);
    for (const key of Object.keys(model.sizes)) {
      const unchanged = !drafts[key] || !dirty(key); saved[key] = next.profiles[key];
      if (unchanged && !busy) { drafts[key] = clone(saved[key]); undo[key] = []; }
    }
    const signature = JSON.stringify(state.settings?.appearance);
    if (signature !== appearanceSignature) { appearanceSignature = signature; for (const node of nodes.values()) appearance(node.querySelector('iframe')); }
    render();
  }
  api.onState(receive);
  api.get().then(state => { if (!snapshot) receive(state); }).catch(() => tell('正在等待工作台就绪',true));
  document.addEventListener('canvas:visibility', event => { active = event.detail?.visible !== false; render(); });
  let fitFrame = 0;
  new ResizeObserver(() => { if (!fitFrame) fitFrame = requestAnimationFrame(() => { fitFrame = 0; fit(); }); }).observe($('layout-stage-wrap'));
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && $('obs-layout-editor').classList.contains('layout-expanded')) { $('obs-layout-editor').classList.remove('layout-expanded'); fit(); } });
})();
