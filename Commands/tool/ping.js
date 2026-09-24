const config = require("../../config");
module.exports = {
    name: "ping",
    aliases: ["p"],
    category: "Tools",
    description: "Check bot response latency",
    async execute({ reply, msg }) {
        const start = Date.now();
        await reply(`🏓 Pong!\n⚡ Processing...`);
        const ms = Date.now() - start;
        return reply(`🏓 Pong!\n⚡ Response: ${ms} ms\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
    }
};
