(function (root) {
  'use strict';
  const sizes = { landscape: { width: 1920, height: 1080 }, portrait: { width: 1080, height: 1920 } };
  const modules = ['comments', 'gifts', 'likes', 'welcome', 'songs', 'animations', 'poll'];
  const names = { comments: '弹幕', gifts: '礼物消息', likes: '点赞', welcome: '进房欢迎', songs: '点歌台', animations: '礼物互动', poll: '问题投票' };
  const routes = { comments: 'overlay?type=comment', gifts: 'overlay?type=gift', likes: 'overlay?type=like', welcome: 'overlay?type=enter', songs: 'songs', animations: 'gift-animation', poll: 'rhythm-topic' };
  function preset(orientation) {
    if (!Object.hasOwn(sizes, orientation)) throw new Error('画布方向无效');
    const positions = orientation === 'landscape'
      ? [[40,620,570,420],[40,120,570,200],[40,470,400,120],[40,340,570,120],[1360,80,520,900],[0,0,1920,1080],[650,700,640,340]]
      : [[40,1370,1000,510],[40,100,500,180],[40,1230,500,100],[40,1080,850,120],[600,180,440,850],[0,0,1080,1920],[40,700,1000,340]];
    return { revision: 0, modules: modules.map((id, i) => ({ id, x: positions[i][0], y: positions[i][1], width: positions[i][2], height: positions[i][3],
      visible: ['comments','songs','animations'].includes(id), locked: id === 'animations', layer: i })) };
  }
  function validate(profile, orientation) {
    if (!Object.hasOwn(sizes, orientation)) throw new Error('画布方向无效');
    const size = sizes[orientation];
    if (!size || !profile || !Array.isArray(profile.modules) || profile.modules.length !== modules.length) throw new Error('画布布局无效');
    const found = new Set();
    const list = profile.modules.map(item => {
      if (!item || !modules.includes(item.id) || found.has(item.id)) throw new Error('画布模块无效');
      found.add(item.id);
      for (const key of ['x','y','width','height','layer']) if (!Number.isInteger(item[key])) throw new Error('画布尺寸必须为整数');
      if (item.x < 0 || item.y < 0 || item.width < 80 || item.height < 60 || item.x + item.width > size.width || item.y + item.height > size.height ||
        item.layer < 0 || item.layer > 20 || typeof item.visible !== 'boolean' || typeof item.locked !== 'boolean') throw new Error('模块超出画布或属性无效');
      return { id: item.id, x: item.x, y: item.y, width: item.width, height: item.height, visible: item.visible, locked: item.locked, layer: item.layer };
    });
    return { revision: Number.isSafeInteger(profile.revision) && profile.revision >= 0 ? profile.revision : 0, modules: list };
  }
  function normalize(value) {
    const profiles = {};
    for (const orientation of Object.keys(sizes)) {
      try { profiles[orientation] = validate(value?.profiles?.[orientation], orientation); } catch { profiles[orientation] = preset(orientation); }
    }
    return { version: 1, profiles };
  }
  function apply(value, request) {
    const state = normalize(value), orientation = request?.orientation;
    if (!Object.hasOwn(sizes, orientation)) throw new Error('画布方向无效');
    if (request.baseRevision !== state.profiles[orientation].revision) throw new Error('布局已在其他窗口更新，请重新载入后再应用');
    const next = validate(request.profile, orientation);
    next.revision = state.profiles[orientation].revision + 1;
    state.profiles[orientation] = next; return state;
  }
  function bound(item, orientation) {
    if (!Object.hasOwn(sizes, orientation)) throw new Error('画布方向无效');
    const size = sizes[orientation];
    const width = Math.min(size.width, Math.max(80, Math.round(item.width))), height = Math.min(size.height, Math.max(60, Math.round(item.height)));
    return { ...item, width, height, x: Math.max(0, Math.min(size.width - width, Math.round(item.x))), y: Math.max(0, Math.min(size.height - height, Math.round(item.y))) };
  }
  // Highest layer first; equal layers follow browser paint order (last sibling wins).
  function stack(profile) {
    return profile.modules.map((item, index) => ({ item, index }))
      .sort((a, b) => b.item.layer - a.item.layer || b.index - a.index).map(row => row.item);
  }
  function reorder(profile, id, destination) {
    const ordered = stack(profile), index = ordered.findIndex(item => item.id === id);
    if (index < 0 || ordered[index].locked || !Number.isInteger(destination)) return profile;
    const target = Math.max(0, Math.min(ordered.length - 1, destination));
    if (target === index) return profile;
    ordered.splice(target, 0, ordered.splice(index, 1)[0]);
    const layers = new Map(ordered.map((item, i) => [item.id, ordered.length - 1 - i]));
    return { ...profile, modules: profile.modules.map(item => ({ ...item, layer: layers.get(item.id) })) };
  }
  const api = { sizes, modules, names, routes, preset, validate, normalize, apply, bound, stack, reorder };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FurryUPObsLayout = api;
})(typeof globalThis === 'object' ? globalThis : this);
