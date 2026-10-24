'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
test('offline interact.js and its license match the pinned upstream provenance',()=>{
 const directory=path.resolve(__dirname,'../web/vendor/interactjs'),meta=JSON.parse(fs.readFileSync(path.join(directory,'PROVENANCE.json')));
 assert.equal(meta.version,'1.10.28');assert.equal(meta.license,'MIT');assert.equal(meta.modified,false);
 assert.equal(meta.files['interact.min.js'],'d62316ae5ad9c507278d3d0b354ca115df87a57cc7b30c0eaeba7c03c5c384f8');
 for(const[name,digest]of Object.entries(meta.files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(directory,name))).digest('hex'),digest);
});
