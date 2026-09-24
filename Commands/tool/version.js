const config = require("../../config");
module.exports={name:"version",aliases:["ver"],category:"Tools",description:"Show bot version",async execute({reply}){return reply(`📦 ${config.BOT_NAME}\n🔖 Version: ${config.VERSION || "1.0.0"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);}};
