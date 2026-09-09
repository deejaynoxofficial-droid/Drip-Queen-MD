const config = require("../../config");

const {
    getSettings,
    updateSetting
} = require("../../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO REPLY COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "autoreply",

    aliases: [
        "replyauto",
        "autoreplybot"
    ],

    category: "Auto Features",

    description:
        "Enable or disable automatic replies.",

    usage:
        `${config.PREFIX}autoreply <on/off>`,

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
║       💬 AUTO REPLY          ║
╚══════════════════════════════╝

Current Status:

${settings.autoReply ? "🟢 ENABLED" : "🔴 DISABLED"}

Usage:

${config.PREFIX}autoreply on
${config.PREFIX}autoreply off

> ${config.BOT_NAME}
                `);
            }

            if (
                option !== "on" &&
                option !== "off"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}autoreply on or off`
                );
            }

            const enabled =
                option === "on";

            const success =
                updateSetting(
                    "autoReply",
                    enabled
                );

            if (!success) {
                return await reply(
                    "❌ Failed to update Auto Reply settings."
                );
            }

            await react(
                enabled ? "🟢" : "🔴"
            );

            await reply(`
╔══════════════════════════════╗
║       💬 AUTO REPLY          ║
╚══════════════════════════════╝

Status Updated Successfully!

${enabled
    ? "🟢 AUTO REPLY ENABLED"
    : "🔴 AUTO REPLY DISABLED"}

${enabled
    ? "The bot will automatically reply to incoming messages."
    : "The bot will no longer automatically reply."}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[AUTOREPLY COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update Auto Reply."
                );
            } catch {}
        }
    }
};