const config = require('../../config');
const items=['What is one goal you have never told anyone about?','What is the last thing that made you genuinely proud?','What skill would you learn if time did not matter?'];
module.exports={name:'truth',aliases:[],category:'Fun',description:'Truth question',async execute({reply}){return reply(`🎯 TRUTH\n\n${items[Math.floor(Math.random()*items.length)]}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
