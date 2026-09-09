const config = require("../../config");

const {
    getSettings,
    updateSetting
} = require("../../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO REACT COMMAND
// ==========================================

module.exports = {
    name: "autoreact",

    aliases: [
        "reactauto",
        "autoreaction"
    ],

    category: "Auto Features",

    description:
        "Enable or disable automatic message reactions.",

    usage:
        `${config.PREFIX}autoreact <on/off>`,

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
║      🤖 AUTO REACTION        ║
╚══════════════════════════════╝

Current Status:

${settings.autoReact ? "🟢 ENABLED" : "🔴 DISABLED"}

Usage:

${config.PREFIX}autoreact on
${config.PREFIX}autoreact off
                `);
            }

            if (
                option !== "on" &&
                option !== "off"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}autoreact on or off`
                );
            }

            const enabled =
                option === "on";

            const success =
                updateSetting(
                    "autoReact",
                    enabled
                );

            if (!success) {
                return await reply(
                    "❌ Failed to update Auto React settings."
                );
            }

            await react(
                enabled ? "🟢" : "🔴"
            );

            await reply(`
╔══════════════════════════════╗
║      🤖 AUTO REACTION        ║
╚══════════════════════════════╝

Status Successfully Updated:

${enabled ? "🟢 AUTO REACT ENABLED" : "🔴 AUTO REACT DISABLED"}

> ${config.BOT_NAME}
            `);

        } catch (error) {
            console.error(
                "[AUTOREACT COMMAND ERROR]",
                error.message
            );

            await reply(
                "❌ Unable to update Auto React."
            );
        }
    }
};