'use strict';
(() => {
  const editKey=new URLSearchParams(location.search).get('edit')||'',listeners=new Set();let current;
  async function request(route,body){const response=await fetch(route,{method:body?'POST':'GET',headers:{'X-Canvas-Key':editKey,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw new Error('本地示例服务拒绝请求，请重新打开编辑链接');return response.json();}
  function update(state){
    current=state;
    const status=document.getElementById('canvas-connection'),info=state.diagnostics;
    if(status&&info){
      const stale=info.outputs.filter(client=>!client.current).length;
      const counts=['landscape','portrait'].map(key=>`${key==='landscape'?'横屏':'竖屏'} ${info.outputs.filter(client=>client.current&&client.orientation===key).length}`);
      status.textContent=stale ? `有 ${stale} 个旧版输出连接，请在 OBS 刷新对应浏览器源的页面缓存。` : info.outputs.length ? `输出连接：${counts.join('，')}。连接数包含普通浏览器，不代表 OBS 已显示全部模块。` : '尚无输出连接。勾选模块只控制布局，请把当前画布源添加到 OBS。';
    }
    for(const listener of listeners)listener(state);return state;
  }
  window.FurryUPCanvasHost={
    get:async()=>update(await request('/api/state')),
    onState:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    applyObsLayout:async body=>update(await request('/api/layout',body)),
    copy:async name=>{const key=name.replace(/^canvas-/,'');if(!current?.canvasUrls?.[key])throw new Error('布局未就绪');await navigator.clipboard.writeText(current.canvasUrls[key]);}
  };
  document.getElementById('canvas-check')?.addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{await window.FurryUPCanvasHost.get();}
    catch{document.getElementById('canvas-connection').textContent='连接检查失败，请确认示例服务仍在运行。';}
    finally{button.disabled=false;}
  });
})();
