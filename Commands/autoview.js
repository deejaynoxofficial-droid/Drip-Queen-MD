const config = require("../config");

const {
    getSettings,
    updateSetting
} = require("../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO VIEW COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "autoview",

    aliases: [
        "viewauto",
        "statusview"
    ],

    category: "Auto Features",

    description:
        "Enable or disable automatic viewing of WhatsApp statuses.",

    usage:
        `${config.PREFIX}autoview <on/off>`,

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
║       👁️ AUTO VIEW           ║
╚══════════════════════════════╝

Current Status:

${settings.autoView
    ? "🟢 ENABLED"
    : "🔴 DISABLED"}

Usage:

${config.PREFIX}autoview on
${config.PREFIX}autoview off

ℹ️ When enabled, the bot can
automatically view supported
WhatsApp Status updates.

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
                    `❌ Use ${config.PREFIX}autoview on or off`
                );
            }

            const enabled =
                option === "on";

            // ======================================
            // UPDATE SETTING
            // ======================================

            const success =
                updateSetting(
                    "autoView",
                    enabled
                );

            if (!success) {
                return await reply(
                    "❌ Failed to update Auto View settings."
                );
            }

            await react(
                enabled ? "👁️" : "🔴"
            );

            await reply(`
╔══════════════════════════════╗
║       👁️ AUTO VIEW           ║
╚══════════════════════════════╝

${enabled
    ? "🟢 AUTO VIEW ENABLED"
    : "🔴 AUTO VIEW DISABLED"}

${enabled
    ? "Automatic status viewing is now active."
    : "Automatic status viewing has been turned off."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[AUTOVIEW COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update Auto View."
                );
            } catch {}
        }
    }
};