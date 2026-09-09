const config = require("../../config");

const {
getCommandCount
} = require("../../src/commandLoader");

const {
getSessionStats
} = require("../../src/session");

const {
formatRuntime
} = require("../../lib/functions");

// ==========================================
// DRIP QUEEN MD - BOT INFO COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
name: "botinfo",

aliases: [
    "info",
    "bot"
],

category: "Information",

description: "Display detailed information about the bot.",

usage: `${config.PREFIX}botinfo`,

execute: async ({
    reply,
    react
}) => {
    try {
        const runtime =
            formatRuntime(process.uptime());

        const commandCount =
            getCommandCount();

        const sessionStats =
            getSessionStats();

        await react("ℹ️");

        const message = `

╔══════════════════════════════╗
║      🤖 BOT INFORMATION      ║
╚══════════════════════════════╝

╭─〔 DRIP QUEEN MD 〕
│
│ 👑 Name: ${config.BOT_NAME}
│ ⚡ Version: ${config.BOT_VERSION}
│
│ 📌 Prefix: ${config.PREFIX}
│ 🌐 Mode: ${config.MODE}
│
│ 📚 Commands: ${commandCount}
│ 👥 Active Users: ${sessionStats.active}
│
│ ⏱️ Runtime: ${runtime}
│
╰────────────────────

╭─〔 DEVELOPER 〕
│
│ 👑 ${config.CREATOR}
│
╰────────────────────

«Thank you for using DRIP QUEEN MD 👑
`;

        await reply(message);

    } catch (error) {
        console.error(
            "[BOTINFO COMMAND ERROR]",
            error.message
        );

        try {
            await reply(`

🤖 ${config.BOT_NAME}

👑 Creator: ${config.CREATOR}
⚡ Version: ${config.BOT_VERSION}
📌 Prefix: ${config.PREFIX}
`);
} catch {}
}
}
};