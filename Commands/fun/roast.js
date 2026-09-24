const config = require('../../config');
const items=['🔥 You are not late; you are just running on your own timezone.','😂 Even your Wi-Fi has more connection than you do.','🤣 Your loading screen has been running since yesterday.'];
module.exports={name:'roast',aliases:[],category:'Fun',description:'Playful roast',async execute({reply}){return reply(`${items[Math.floor(Math.random()*items.length)]}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
