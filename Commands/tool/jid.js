const config = require("../../config");
module.exports={name:"jid",aliases:["myjid"],category:"Tools",description:"Show the current chat ID",async execute({reply,from}){return reply(`🆔 Chat ID:\n${from}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);}};
