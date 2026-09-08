const config = require("../config");

// ==========================================
// DRIP QUEEN MD - DEMOTE COMMAND
// Creator: NOX STAR TECH
// ==========================================

function normalizeJid(jid = "") {
    return String(jid)
        .split("@")[0]
        .replace(/:\d+$/, "")
        .replace(/\D/g, "");
}

function getTargetJid(message) {
    try {
        const contextInfo =
            message?.message?.extendedTextMessage
                ?.contextInfo;

        // Mentioned user
        const mentioned =
            contextInfo?.mentionedJid;

        if (mentioned?.length) {
            return mentioned[0];
        }

        // Replied message sender
        const quotedParticipant =
            contextInfo?.participant;

        if (quotedParticipant) {
            return quotedParticipant;
        }

        return null;

    } catch {
        return null;
    }
}

module.exports = {
    name: "demote",

    aliases: [
        "removeadmin",
        "unadmin"
    ],

    category: "Group",

    description:
        "Remove admin privileges from a group member.",

    usage:
        `${config.PREFIX}demote @user`,

    execute: async ({
        reply,
        react,
        sock,
        from,
        sender,
        isGroup,
        message
    }) => {
        try {

            // ===============================
            // GROUP CHECK
            // ===============================

            if (!isGroup) {
                return await reply(
                    "❌ This command can only be used in a group."
                );
            }

            // ===============================
            // GET TARGET
            // ===============================

            const target =
                getTargetJid(message);

            if (!target) {
                return await reply(`
╔══════════════════════════════╗
║      ⬇️ DEMOTE MEMBER        ║
╚══════════════════════════════╝

Usage:

${config.PREFIX}demote @user

Or reply to an admin's message:

${config.PREFIX}demote
`);
            }

            // ===============================
            // GET GROUP METADATA
            // ===============================

            const metadata =
                await sock.groupMetadata(from);

            const participants =
                metadata.participants || [];

            const senderNumber =
                normalizeJid(sender);

            const botNumber =
                normalizeJid(sock.user?.id);

            const targetNumber =
                normalizeJid(target);

            // ===============================
            // FIND PARTICIPANTS
            // ===============================

            const senderData =
                participants.find(
                    participant =>
                        normalizeJid(
                            participant.id
                        ) === senderNumber
                );

            const botData =
                participants.find(
                    participant =>
                        normalizeJid(
                            participant.id
                        ) === botNumber
                );

            const targetData =
                participants.find(
                    participant =>
                        normalizeJid(
                            participant.id
                        ) === targetNumber
                );

            // ===============================
            // SENDER ADMIN CHECK
            // ===============================

            if (!senderData?.admin) {
                return await reply(
                    "❌ Only group admins can use this command."
                );
            }

            // ===============================
            // BOT ADMIN CHECK
            // ===============================

            if (!botData?.admin) {
                return await reply(
                    "❌ Please make the bot a group admin first."
                );
            }

            // ===============================
            // TARGET CHECK
            // ===============================

            if (!targetData) {
                return await reply(
                    "❌ That user is not a member of this group."
                );
            }

            // ===============================
            // CHECK IF TARGET IS ADMIN
            // ===============================

            if (!targetData.admin) {
                return await reply(
                    `⚠️ @${targetNumber} is not a group admin.`
                );
            }

            // ===============================
            // PROTECT GROUP OWNER
            // ===============================

            if (
                normalizeJid(metadata.owner) ===
                targetNumber
            ) {
                return await reply(
                    "❌ The group owner cannot be demoted."
                );
            }

            // ===============================
            // PREVENT DEMOTING BOT
            // ===============================

            if (targetNumber === botNumber) {
                return await reply(
                    "❌ I cannot demote myself."
                );
            }

            // ===============================
            // DEMOTE USER
            // ===============================

            await sock.groupParticipantsUpdate(
                from,
                [target],
                "demote"
            );

            await react("⬇️");

            await sock.sendMessage(
                from,
                {
                    text: `
╔══════════════════════════════╗
║      ⬇️ MEMBER DEMOTED       ║
╚══════════════════════════════╝

@${targetNumber} has been removed
from the group admin position.

Action performed by:

@${senderNumber}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`,
                    mentions: [
                        target,
                        sender
                    ]
                }
            );

        } catch (error) {

            console.error(
                "[DEMOTE COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to demote that member. Make sure the bot has admin privileges."
                );
            } catch {}
        }
    }
};