'use strict';
(() => {
  const params=new URLSearchParams(location.search),types={comment:'comments',gift:'gifts',like:'likes',enter:'welcome'};
  const routes={'/songs':'songs','/gift-animation':'animations','/rhythm-topic':'poll','/canvas-poll-preview':'poll'};
  const kind=params.get('module')||routes[location.pathname]||types[params.get('type')]||'comments';
  const examples={comments:['示例观众','这是一条演示弹幕'],gifts:['示例礼物','感谢示例观众的支持'],likes:['点赞','128 次示例点赞'],welcome:['欢迎来到直播间','这是合成示例内容'],songs:['示例旋律','示例乐队 · 等待队列 2 首'],animations:['♡',''],poll:['一起聊聊','示例投票：选择 A 或 B']};
  const[title,detail]=examples[kind]||[window.FurryUPObsLayout.names[kind]||'自定义模块','这是合成示例内容'];document.body.dataset.kind=kind;document.getElementById('title').textContent=title;document.getElementById('detail').textContent=detail;
  if(params.get('canvas')!=='1')return;
  const stream=window.FurryUPCanvasStream('/unused');
  if(kind==='status')stream.addEventListener('status-state',event=>{try{document.getElementById('detail').textContent=String(JSON.parse(event.data).text||'');}catch{}});
  if(kind==='songs')stream.addEventListener('song-state',event=>{try{const value=JSON.parse(event.data);document.getElementById('title').textContent=String(value.title||'等待歌曲');document.getElementById('detail').textContent=String(value.artist||'');}catch{}});
  if(kind==='comments')stream.addEventListener('live-event',event=>{try{const value=JSON.parse(event.data);document.getElementById('title').textContent=String(value.user_name||'示例观众');document.getElementById('detail').textContent=String(value.content||'');}catch{}});
  window.addEventListener('pagehide',()=>stream.close(),{once:true});
})();
