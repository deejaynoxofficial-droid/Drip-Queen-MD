const config = require('../../config');
const items=['🐙 Octopuses have three hearts.','🌍 A day on Venus is longer than its year.','🧠 The human brain contains billions of neurons.'];
module.exports={name:'fact',aliases:['funfact'],category:'Fun',description:'Random fact',async execute({reply}){return reply(`${items[Math.floor(Math.random()*items.length)]}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
