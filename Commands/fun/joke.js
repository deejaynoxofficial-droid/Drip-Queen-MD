const config = require('../../config');
const items = ['😂 Why did the developer go broke? Because they used up all their cache!','🤣 I told my computer I needed a break. Now it keeps sending me vacation ads.'];
module.exports={name:'joke',aliases:[],category:'Fun',description:'Tell a joke',async execute({reply}){return reply(`${items[Math.floor(Math.random()*items.length)]}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
