const config = require("../../config");
const quotes=[
"✨ Small steps every day create big results.",
"🔥 Build quietly. Let the results make the noise.",
"🚀 Consistency beats intensity when intensity is temporary.",
"💎 Keep learning. Keep building. Keep improving.",
"🌟 Your next level starts with the next action."
];
module.exports={name:"quote",aliases:["motivate"],category:"Tools",description:"Send a motivational quote",async execute({reply}){const q=quotes[Math.floor(Math.random()*quotes.length)];return reply(`${q}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);}};
