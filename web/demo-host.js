'use strict';
(() => {
  const editKey=new URLSearchParams(location.search).get('edit')||'',listeners=new Set();let current;
  async function request(route,body){const response=await fetch(route,{method:body?'POST':'GET',headers:{'X-Canvas-Key':editKey,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw new Error('本地示例服务拒绝请求，请重新打开编辑链接');return response.json();}
  function update(state){current=state;for(const listener of listeners)listener(state);return state;}
  window.FurryUPCanvasHost={
    get:async()=>update(await request('/api/state')),
    onState:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    applyObsLayout:async body=>update(await request('/api/layout',body)),
    copy:async name=>{const key=name.replace(/^canvas-/,'');if(!current?.canvasUrls?.[key])throw new Error('布局未就绪');await navigator.clipboard.writeText(current.canvasUrls[key]);}
  };
})();
