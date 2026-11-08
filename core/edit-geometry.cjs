/* FUS editor adapter. OBS gesture conventions; no OBS implementation code. */
(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const emptyCrop=()=>({left:0,top:0,right:0,bottom:0});
  function source(item){return {width:item.sourceWidth||item.width,height:item.sourceHeight||item.height};}
  function crop(item){return {...emptyCrop(),...item.crop};}
  function scales(item){const d=source(item),c=crop(item);return {x:item.width/(d.width-c.left-c.right),y:item.height/(d.height-c.top-c.bottom)};}
  function withCrop(item,next){
    const d=source(item),old=crop(item),s=scales(item),c={...old,...next};
    for(const edge of Object.keys(c))c[edge]=Math.round(clamp(c[edge],0,(edge==='left'||edge==='right'?d.width:d.height)-2));
    c.right=Math.min(c.right,d.width-c.left-2);c.bottom=Math.min(c.bottom,d.height-c.top-2);
    return {...item,sourceWidth:d.width,sourceHeight:d.height,crop:c,x:item.x+(c.left-old.left)*s.x,y:item.y+(c.top-old.top)*s.y,width:(d.width-c.left-c.right)*s.x,height:(d.height-c.top-c.bottom)*s.y};
  }
  function gesture(item,handle,dx,dy,{altKey=false,shiftKey=false}={}){
    if(handle==='move')return {...item,x:item.x+dx,y:item.y+dy};
    const w=handle.includes('w'),e=handle.includes('e'),n=handle.includes('n'),s=handle.includes('s');
    if(altKey){const c=crop(item),k=scales(item),d=source(item);
      if(w)c.left=clamp(c.left+Math.round(dx/k.x),0,d.width-c.right-2);
      if(e)c.right=clamp(c.right-Math.round(dx/k.x),0,d.width-c.left-2);
      if(n)c.top=clamp(c.top+Math.round(dy/k.y),0,d.height-c.bottom-2);
      if(s)c.bottom=clamp(c.bottom-Math.round(dy/k.y),0,d.height-c.top-2);
      return withCrop(item,c);
    }
    let width=Math.max(2,item.width+(e?dx:w?-dx:0)),height=Math.max(2,item.height+(s?dy:n?-dy:0));
    if(!shiftKey){let ratio;
      if((w||e)&&(n||s))ratio=Math.abs(width/item.width-1)>=Math.abs(height/item.height-1)?width/item.width:height/item.height;
      else ratio=w||e?width/item.width:height/item.height;
      ratio=Math.max(2/item.width,2/item.height,ratio);width=item.width*ratio;height=item.height*ratio;
    }
    const d=source(item);
    return {...item,sourceWidth:d.width,sourceHeight:d.height,x:w?item.x+item.width-width:item.x,y:n?item.y+item.height-height:item.y,width,height};
  }
  function snap(item,others,size,scale=1,{enabled=true,ctrlKey=false,handle='move'}={}){
    if(!enabled||ctrlKey)return {item,guides:[]};
    const result={...item},guides=[],range=10/Math.max(.01,scale);
    for(const [axis,dimension,low,high] of [['x','width','w','e'],['y','height','n','s']]){
      const marks=[0,.5,1].map(f=>({position:size[dimension]*f,center:f===.5}));
      for(const other of others)for(const f of [0,.5,1])marks.push({position:other[axis]+other[dimension]*f,center:f===.5});
      const fractions=handle==='move'?[0,.5,1]:handle.includes(low)?[0]:handle.includes(high)?[1]:[];
      let best=null;
      for(const mark of marks)for(const f of fractions){if(mark.center!==(f===.5))continue;const delta=mark.position-item[axis]-item[dimension]*f;
        if(Math.abs(delta)<=range&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,mark:mark.position,f};}
      if(!best)continue;
      if(handle==='move')result[axis]+=best.delta;
      else if(best.f===0){result[axis]+=best.delta;result[dimension]-=best.delta;}else result[dimension]+=best.delta;
      guides.push({axis,position:best.mark});
    }
    return {item:result,guides};
  }
  function fromAirplay(state){const d=state.dimensions,c=crop(state),t=state.transform||{};return {x:0,y:0,sourceWidth:d.width,sourceHeight:d.height,crop:c,width:(d.width-c.left-c.right)*Math.abs(t.scaleX||1),height:(d.height-c.top-c.bottom)*Math.abs(t.scaleY||1)};}
  function fitResize(item,origin,handle,size){
    const left=handle.includes('w'),top=handle.includes('n');
    const maxWidth=left?origin.x+origin.width:size.width-origin.x,maxHeight=top?origin.y+origin.height:size.height-origin.y;
    const factor=Math.min(1,maxWidth/item.width,maxHeight/item.height),width=item.width*factor,height=item.height*factor;
    return {...item,width,height,x:left?origin.x+origin.width-width:origin.x,y:top?origin.y+origin.height-height:origin.y};
  }
  function paint(frame,image,box,item,base=item){
    const rect=frame.getBoundingClientRect(),k=Math.min(rect.width/(base.width*1.4),rect.height/(base.height*1.4)),d=source(item),c=crop(item),s=scales(item);
    const left=(rect.width-base.width*k)/2+item.x*k,top=(rect.height-base.height*k)/2+item.y*k;
    Object.assign(box.style,{left:left+'px',top:top+'px',width:item.width*k+'px',height:item.height*k+'px',right:'auto',bottom:'auto'});
    if(image)Object.assign(image.style,{position:'absolute',left:(left-c.left*s.x*k)+'px',top:(top-c.top*s.y*k)+'px',width:d.width*s.x*k+'px',height:d.height*s.y*k+'px',maxWidth:'none',objectFit:'fill',clipPath:`inset(${100*c.top/d.height}% ${100*c.right/d.width}% ${100*c.bottom/d.height}% ${100*c.left/d.width}%)`});
    return k;
  }
  const api=Object.freeze({source,crop,scales,withCrop,gesture,snap,fromAirplay,paint,fitResize});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FurryUPObsEdit=api;
})(typeof globalThis==='object'?globalThis:this);
