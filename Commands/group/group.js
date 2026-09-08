const config = require("../config");

// ==========================================
// DRIP QUEEN MD - GROUP COMMAND
// Creator: NOX STAR TECH
// ==========================================

function normalizeJid(jid = "") {
    return String(jid)
        .split("@")[0]
        .replace(/:\d+$/, "")
        .replace(/\D/g, "");
}

module.exports = {
    name: "group",

    aliases: [
        "groupopen",
        "groupclose",
        "gc"
    ],

    category: "Group",

    description:
        "Open or close a WhatsApp group.",

    usage:
        `${config.PREFIX}group <open/close>`,

    execute: async ({
        args,
        reply,
        react,
        sock,
        from,
        sender,
        isGroup
    }) => {
        try {

            // ==================================
            // GROUP CHECK
            // ==================================

            if (!isGroup) {
                return await reply(
                    "❌ This command can only be used in a group."
                );
            }

            const option =
                args[0]?.toLowerCase();

            // ==================================
            // SHOW HELP
            // ==================================

            if (!option) {
                return await reply(`
╔══════════════════════════════╗
║       👥 GROUP SETTINGS      ║
╚══════════════════════════════╝

Available Options:

🔓 ${config.PREFIX}group open
   Allow all members to send messages.

🔒 ${config.PREFIX}group close
   Only admins can send messages.

⚠️ Requirements:
• You must be a group admin.
• The bot must be a group admin.

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);
            }

            // ==================================
            // VALIDATE OPTION
            // ==================================

            if (
                option !== "open" &&
                option !== "close"
            ) {
                return await reply(
                    `❌ Use ${config.PREFIX}group open or close`
                );
            }

            // ==================================
            // GET GROUP METADATA
            // ==================================

            let metadata;

            try {
                metadata =
                    await sock.groupMetadata(from);
            } catch (error) {
                console.error(
                    "[GROUP METADATA ERROR]",
                    error.message
                );

                return await reply(
                    "❌ Unable to get group information."
                );
            }

            const participants =
                metadata.participants || [];

            const senderNumber =
                normalizeJid(sender);

            const botJid =
                sock.user?.id || "";

            const botNumber =
                normalizeJid(botJid);

            const senderData =
                participants.find(participant =>
                    normalizeJid(participant.id) === senderNumber
                );

            const botData =
                participants.find(participant =>
                    normalizeJid(participant.id) === botNumber
                );

            const isAdmin = Boolean(
                senderData?.admin
            );

            const isBotAdmin = Boolean(
                botData?.admin
            );

            // ==================================
            // USER ADMIN CHECK
            // ==================================

            if (!isAdmin) {
                return await reply(
                    "❌ Only group admins can use this command."
                );
            }

            // ==================================
            // BOT ADMIN CHECK
            // ==================================

            if (!isBotAdmin) {
                return await reply(
                    "❌ Please make the bot a group admin first."
                );
            }

            // ==================================
            // UPDATE GROUP SETTINGS
            // ==================================

            if (option === "open") {

                await sock.groupSettingUpdate(
                    from,
                    "not_announcement"
                );

                await react("🔓");

                return await reply(`
╔══════════════════════════════╗
║        🔓 GROUP OPENED       ║
╚══════════════════════════════╝

All group members can now
send messages.

👮 Action performed by:
@${senderNumber}

> ${config.BOT_NAME}
`);
            }

            if (option === "close") {

                await sock.groupSettingUpdate(
                    from,
                    "announcement"
                );

                await react("🔒");

                return await reply(`
╔══════════════════════════════╗
║        🔒 GROUP CLOSED       ║
╚══════════════════════════════╝

Only group admins can now
send messages.

👮 Action performed by:
@${senderNumber}

> ${config.BOT_NAME}
`);
            }

        } catch (error) {

            console.error(
                "[GROUP COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to update group settings."
                );
            } catch {}
        }
    }
};