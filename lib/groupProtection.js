const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "database", "group-protection.json");
const defaults = {
  antispam: false,
  antiflood: false,
  antibot: false,
  antimention: false,
  antitag: false,
  antinsfw: false
};
function read(){ try { if(!fs.existsSync(file)){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,"{}");} return JSON.parse(fs.readFileSync(file,"utf8")||"{}"); } catch{return {};}}
function write(d){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(d,null,2));}
function get(group){ return {...defaults,...(read()[group]||{})}; }
function set(group,key,value){ const d=read(); d[group]={...defaults,...(d[group]||{}),[key]:value}; write(d); return d[group];}
module.exports={defaults,get,set};
