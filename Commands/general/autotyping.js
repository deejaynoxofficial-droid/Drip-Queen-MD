const config = require("../config");

const {
    getSettings,
    updateSetting
} = require("../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO TYPING COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "autotyping",

    aliases: [
        "typingauto",
        "autotype"
    ],

    category: "Auto Features",

    description:
        "Enable or disable automatic typing status.",

    usage:
        `${config.PREFIX}autotyping <on/off>`,

    execute: async ({
        args,
        reply,
        react
    }) => {
        try {
            const option = args[0]?.toLowerCase();

            // Show current status
            if (!option) {
                const settings = getSettings();

                return await reply(`
╔══════════════════════════════╗
║      ⌨️ AUTO TYPING          ║
╚══════════════════════════════╝

Current Status:

${settings.autoTyping ? "🟢 ENABLED" : "🔴 DISABLED"}

Usage:

${config.PREFIX}autotyping on
${config.PREFIX}autotyping off

> ${config.BOT_NAME}
`);
            }

            // Validate option
            if (
                option !== "on" &&
                option !== "off"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}autotyping on or off`
                );
            }

            const enabled = option === "on";

            const success = updateSetting(
                "autoTyping",
                enabled
            );

            if (!success) {
                return await reply(
                    "❌ Failed to update Auto Typing settings."
                );
            }

            await react(
                enabled ? "⌨️" : "🔴"
            );

            await reply(`
╔══════════════════════════════╗
║      ⌨️ AUTO TYPING          ║
╚══════════════════════════════╝

Status Updated Successfully!

${enabled
    ? "🟢 AUTO TYPING ENABLED"
    : "🔴 AUTO TYPING DISABLED"}

${enabled
    ? "The bot will show a typing indicator when messages are received."
    : "The bot will no longer show automatic typing status."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[AUTOTYPING COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update Auto Typing."
                );
            } catch {}
        }
    }
};