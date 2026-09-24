const config = require('../../config');
module.exports={name:'rate',aliases:['rating'],category:'Fun',description:'Give a playful random rating',async execute({reply,args}){const target=args.join(' ')||'you';const score=Math.floor(Math.random()*101);return reply(`⭐ RATING\n\n${target}: ${score}/100\n\n🎲 Just for fun.\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`)}};
