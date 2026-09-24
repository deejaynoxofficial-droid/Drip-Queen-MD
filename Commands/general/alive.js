const config = require("../../config");

const {
formatRuntime
} = require("../../lib/functions");

// ==========================================
// DRIP QUEEN MD - ALIVE COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
name: "alive",

aliases: [
    "status",
    "online"
],

category: "General",

description: "Check whether the bot is online.",

usage: `${config.PREFIX}alive`,

execute: async ({
    reply,
    react
}) => {
    try {
        const runtime = formatRuntime(process.uptime());

        await react("👑");

        const aliveMessage = `

╔══════════════════════════════╗
║      👑 DRIP QUEEN MD 👑      ║
╚══════════════════════════════╝

╭─〔 BOT STATUS 〕
│
│ 🟢 Status: Online
│ ⚡ Version: ${config.BOT_VERSION}
│ ⏱️ Runtime: ${runtime}
│ 📌 Prefix: ${config.PREFIX}
│ 🌐 Mode: ${config.MODE}
│
╰────────────────────

╭─〔 DEVELOPER 〕
│ 👑 Creator: ${config.CREATOR}
╰────────────────────

> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}
`;

        await reply(aliveMessage);

    } catch (error) {
        console.error(
            "[ALIVE COMMAND ERROR]",
            error.message
        );

        try {
            await reply(
                `🟢 ${config.BOT_NAME} is online and running!`
            );
        } catch {}
    }
}

};