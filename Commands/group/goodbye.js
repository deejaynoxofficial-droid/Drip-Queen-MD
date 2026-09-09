const config = require("../../config");

const {
    getSettings,
    updateSetting
} = require("../../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - GOODBYE COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "goodbye",

    aliases: [
        "farewell",
        "goodbyesystem"
    ],

    category: "Auto Features",

    description:
        "Enable or disable automatic goodbye messages in groups.",

    usage:
        `${config.PREFIX}goodbye <on/off>`,

    execute: async ({
        args,
        reply,
        react
    }) => {
        try {
            const option =
                args[0]?.toLowerCase();

            // ======================================
            // SHOW CURRENT STATUS
            // ======================================

            if (!option) {
                const settings =
                    getSettings();

                return await reply(`
╔══════════════════════════════╗
║       👋 GOODBYE SYSTEM      ║
╚══════════════════════════════╝

Current Status:

${settings.goodbye
    ? "🟢 ENABLED"
    : "🔴 DISABLED"}

Usage:

${config.PREFIX}goodbye on
${config.PREFIX}goodbye off

ℹ️ When enabled, the bot will send
a goodbye message when a member
leaves or is removed from a group.

> ${config.BOT_NAME}
`);
            }

            // ======================================
            // VALIDATE OPTION
            // ======================================

            if (
                option !== "on" &&
                option !== "off"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}goodbye on or off`
                );
            }

            const enabled =
                option === "on";

            // ======================================
            // UPDATE SETTING
            // ======================================

            const success =
                updateSetting(
                    "goodbye",
                    enabled
                );

            if (!success) {
                return await reply(
                    "❌ Failed to update Goodbye settings."
                );
            }

            await react(
                enabled ? "👋" : "🔴"
            );

            // ======================================
            // SUCCESS MESSAGE
            // ======================================

            await reply(`
╔══════════════════════════════╗
║       👋 GOODBYE SYSTEM      ║
╚══════════════════════════════╝

${enabled
    ? "🟢 GOODBYE ENABLED"
    : "🔴 GOODBYE DISABLED"}

${enabled
    ? "Members leaving the group will receive a goodbye message."
    : "Automatic goodbye messages have been turned off."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[GOODBYE COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update Goodbye settings."
                );
            } catch {}
        }
    }
};