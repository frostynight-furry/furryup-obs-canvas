'use strict';
// Synthetic extension: no platform, rule, effect or model integration.
const model = require('../core/layout.cjs');
const status = {
  id:'status', name:'状态示例', route:'status', events:['status-state'],
  defaults:{
    landscape:{x:700,y:40,width:500,height:160,layer:7,visible:false,locked:false},
    portrait:{x:40,y:40,width:900,height:160,layer:7,visible:false,locked:false}
  }
};
module.exports = [...model.definitions, status];
