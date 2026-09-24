const os = require("os");
const config = require("../../config");
module.exports={name:"system",aliases:["sys"],category:"Tools",description:"Show system information",async execute({reply}){const m=process.memoryUsage();return reply(`╭━━〔 🖥️ SYSTEM 〕━━╮\n│ 🟢 Node: ${process.version}\n│ 💻 Platform: ${process.platform}\n│ 🧠 RAM: ${(m.rss/1024/1024).toFixed(1)} MB\n│ 🧮 CPUs: ${os.cpus().length}\n│ ⏱️ Uptime: ${Math.floor(process.uptime())}s\n╰━━━━━━━━━━━━━━━━━━╯\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);}};
