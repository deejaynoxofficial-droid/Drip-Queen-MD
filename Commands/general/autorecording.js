const config = require("../../config");

const {
    getSettings,
    updateSetting
} = require("../../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO RECORDING COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "autorecording",

    aliases: [
        "recordingauto",
        "autorecord"
    ],

    category: "Auto Features",

    description:
        "Enable or disable automatic recording status.",

    usage:
        `${config.PREFIX}autorecording <on/off>`,

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
                const settings = getSettings();

                return await reply(`
╔══════════════════════════════╗
║    🎙️ AUTO RECORDING        ║
╚══════════════════════════════╝

Current Status:

${settings.autoRecording
    ? "🟢 ENABLED"
    : "🔴 DISABLED"}

Usage:

${config.PREFIX}autorecording on
${config.PREFIX}autorecording off

> ${config.BOT_NAME}
`);
            }

            // Validate option
            if (
                option !== "on" &&
                option !== "off"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}autorecording on or off`
                );
            }

            const enabled =
                option === "on";

            const success =
                updateSetting(
                    "autoRecording",
                    enabled
                );

            if (!success) {
                return await reply(
                    "❌ Failed to update Auto Recording settings."
                );
            }

            await react(
                enabled ? "🎙️" : "🔴"
            );

            await reply(`
╔══════════════════════════════╗
║    🎙️ AUTO RECORDING        ║
╚══════════════════════════════╝

Status Updated Successfully!

${enabled
    ? "🟢 AUTO RECORDING ENABLED"
    : "🔴 AUTO RECORDING DISABLED"}

${enabled
    ? "The bot will show a recording indicator when messages are received."
    : "The bot will no longer show automatic recording status."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[AUTORECORDING COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update Auto Recording."
                );
            } catch {}
        }
    }
};