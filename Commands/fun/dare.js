const config = require('../../config');
const items=['Send the group your best selfie.','Type your next message using only emojis.','Compliment someone in the group.'];
module.exports={name:'dare',aliases:[],category:'Fun',description:'Dare question',async execute({reply}){return reply(`🔥 DARE\n\n${items[Math.floor(Math.random()*items.length)]}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
