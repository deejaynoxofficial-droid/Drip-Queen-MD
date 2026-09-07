const config = require("../config");

const {
    getSettings,
    updateSetting
} = require("../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO STATUS COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "autostatus",

    aliases: [
        "statusauto",
        "statusbot"
    ],

    category: "Auto Features",

    description:
        "Enable or disable automatic WhatsApp status handling.",

    usage:
        `${config.PREFIX}autostatus <on/off>`,

    execute: async ({
        args,
        reply,
        react
    }) => {
        try {
            const option = args[0]?.toLowerCase();

            // SHOW CURRENT STATUS
            if (!option) {
                const settings = getSettings();

                return await reply(`
╔══════════════════════════════╗
║      📱 AUTO STATUS          ║
╚══════════════════════════════╝

Current Status:

${settings.autoStatus
    ? "🟢 ENABLED"
    : "🔴 DISABLED"}

Usage:

${config.PREFIX}autostatus on
${config.PREFIX}autostatus off

ℹ️ When enabled, DRIP QUEEN MD
will automatically handle supported
WhatsApp status events.

> ${config.BOT_NAME}
`);
            }

            // VALIDATE INPUT
            if (
                option !== "on" &&
                option !== "off"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}autostatus on or off`
                );
            }

            const enabled = option === "on";

            // UPDATE SETTING
            const success = updateSetting(
                "autoStatus",
                enabled
            );

            if (!success) {
                return await reply(
                    "❌ Failed to update Auto Status settings."
                );
            }

            await react(
                enabled ? "📱" : "🔴"
            );

            await reply(`
╔══════════════════════════════╗
║      📱 AUTO STATUS          ║
╚══════════════════════════════╝

${enabled
    ? "🟢 AUTO STATUS ENABLED"
    : "🔴 AUTO STATUS DISABLED"}

${enabled
    ? "Automatic status handling is now active."
    : "Automatic status handling has been turned off."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[AUTOSTATUS COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update Auto Status."
                );
            } catch {}
        }
    }
};