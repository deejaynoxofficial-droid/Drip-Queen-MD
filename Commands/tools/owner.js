const config = require("../../config");
module.exports={name:"owner",aliases:["creator"],category:"Tools",description:"Show bot owner information",async execute({reply}){return reply(`👑 Creator: ${config.CREATOR}\n📱 Owner: ${config.OWNER_NUMBER || config.OWNER || "Configured owner"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);}};
