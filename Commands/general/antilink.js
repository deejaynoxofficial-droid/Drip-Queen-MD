const config = require("../../config");

const {
    getSettings,
    updateSetting
} = require("../../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - ANTI LINK COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "antilink",

    aliases: [
        "linkguard",
        "antilinks"
    ],

    category: "Auto Features",

    description:
        "Enable or disable WhatsApp link protection.",

    usage:
        `${config.PREFIX}antilink <on/off>`,

    execute: async ({
        args,
        reply,
        react
    }) => {
        try {
            const option = args[0]?.toLowerCase();

            if (!option) {
                const settings = getSettings();

                return await reply(`
╔══════════════════════════════╗
║       🔗 ANTI LINK           ║
╚══════════════════════════════╝

Current Status:

${settings.antiLink ? "🟢 ENABLED" : "🔴 DISABLED"}

Usage:

${config.PREFIX}antilink on
${config.PREFIX}antilink off

⚠️ Note:
The bot must be an admin in a group for
enforcement actions to work.
`);
            }

            if (!["on", "off"].includes(option)) {
                return await reply(
                    `❌ Use ${config.PREFIX}antilink on or off`
                );
            }

            const enabled = option === "on";

            const success = updateSetting(
                "antiLink",
                enabled
            );

            if (!success) {
                return await reply(
                    "❌ Failed to update Anti Link settings."
                );
            }

            await react(enabled ? "🛡️" : "🔴");

            await reply(`
╔══════════════════════════════╗
║       🔗 ANTI LINK           ║
╚══════════════════════════════╝

${enabled
    ? "🟢 ANTI LINK ENABLED"
    : "🔴 ANTI LINK DISABLED"}

${enabled
    ? "WhatsApp invite links can now be detected."
    : "Link protection has been turned off."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[ANTILINK COMMAND ERROR]",
                error.message
            );

            await reply(
                "❌ Unable to update Anti Link settings."
            );
        }
    }
};