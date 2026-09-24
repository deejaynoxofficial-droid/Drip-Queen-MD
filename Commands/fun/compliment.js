const config = require('../../config');
const items=['🌟 You are doing better than you think.','💎 Your effort is worth something.','🔥 Keep building — your consistency shows.'];
module.exports={name:'compliment',aliases:['praise'],category:'Fun',description:'Give a compliment',async execute({reply}){return reply(`${items[Math.floor(Math.random()*items.length)]}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
