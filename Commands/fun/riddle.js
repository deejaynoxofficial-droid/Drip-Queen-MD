const config = require('../../config');
const items=['🧩 What has keys but cannot open locks? A piano.','🧩 What gets wetter as it dries? A towel.','🧩 What has a face and two hands but no arms or legs? A clock.'];
module.exports={name:'riddle',aliases:['puzzle'],category:'Fun',description:'Random riddle',async execute({reply}){return reply(`${items[Math.floor(Math.random()*items.length)]}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
