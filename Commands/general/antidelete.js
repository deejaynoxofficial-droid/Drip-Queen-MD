const config = require("../../config");

const {
    getSettings,
    updateSetting
} = require("../../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - ANTI DELETE COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "antidelete",

    aliases: [
        "deleteguard",
        "antidel"
    ],

    category: "Auto Features",

    description:
        "Enable or disable deleted message protection.",

    usage:
        `${config.PREFIX}antidelete <on/off>`,

    execute: async ({
        args,
        reply,
        react
    }) => {
        try {
            const option =
                args[0]?.toLowerCase();

            // Show current status
            if (!option) {
                const settings =
                    getSettings();

                return await reply(`
╔══════════════════════════════╗
║      🗑️ ANTI DELETE          ║
╚══════════════════════════════╝

Current Status:

${settings.antiDelete
    ? "🟢 ENABLED"
    : "🔴 DISABLED"}

Usage:

${config.PREFIX}antidelete on
${config.PREFIX}antidelete off

ℹ️ When enabled, deleted messages
can be detected by the bot.
`);
            }

            // Validate option
            if (
                option !== "on" &&
                option !== "off"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}antidelete on or off`
                );
            }

            const enabled =
                option === "on";

            const success =
                updateSetting(
                    "antiDelete",
                    enabled
                );

            if (!success) {
                return await reply(
                    "❌ Failed to update Anti Delete settings."
                );
            }

            await react(
                enabled ? "🛡️" : "🔴"
            );

            await reply(`
╔══════════════════════════════╗
║      🗑️ ANTI DELETE          ║
╚══════════════════════════════╝

Status Updated Successfully!

${enabled
    ? "🟢 ANTI DELETE ENABLED"
    : "🔴 ANTI DELETE DISABLED"}

${enabled
    ? "Deleted messages will be monitored by the bot."
    : "Deleted message monitoring has been turned off."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[ANTIDELETE COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update Anti Delete."
                );
            } catch {}
        }
    }
};