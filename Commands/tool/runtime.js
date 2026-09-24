const config = require("../../config");
function format(sec){sec=Math.floor(sec);const d=Math.floor(sec/86400);sec%=86400;const h=Math.floor(sec/3600);sec%=3600;const m=Math.floor(sec/60);const s=sec%60;return `${d}d ${h}h ${m}m ${s}s`;}
module.exports={name:"runtime",aliases:["rt"],category:"Tools",description:"Show bot uptime",async execute({reply}){return reply(`⏱️ Uptime: ${format(process.uptime())}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);}};
