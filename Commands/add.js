const config = require("../config");

// ==========================================
// DRIP QUEEN MD - ADD MEMBER COMMAND
// Creator: NOX STAR TECH
// ==========================================

function normalizeNumber(value = "") {
    return String(value)
        .split("@")[0]
        .replace(/:\d+$/, "")
        .replace(/\D/g, "");
}

function getMentionedJid(message) {
    try {
        const mentioned =
            message?.message?.extendedTextMessage
                ?.contextInfo?.mentionedJid;

        if (mentioned?.length) {
            return mentioned[0];
        }

        return null;
    } catch {
        return null;
    }
}

module.exports = {
    name: "add",

    aliases: [
        "adduser",
        "addmember"
    ],

    category: "Group",

    description:
        "Add a member to the WhatsApp group.",

    usage:
        `${config.PREFIX}add <number>`,

    execute: async ({
        args,
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
            // GET GROUP METADATA
            // ===============================

            const metadata =
                await sock.groupMetadata(from);

            const participants =
                metadata.participants || [];

            const senderNumber =
                normalizeNumber(sender);

            const botNumber =
                normalizeNumber(sock.user?.id);

            // ===============================
            // FIND SENDER AND BOT
            // ===============================

            const senderData =
                participants.find(
                    participant =>
                        normalizeNumber(
                            participant.id
                        ) === senderNumber
                );

            const botData =
                participants.find(
                    participant =>
                        normalizeNumber(
                            participant.id
                        ) === botNumber
                );

            // ===============================
            // ADMIN CHECK
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
            // GET TARGET NUMBER
            // ===============================

            let targetJid =
                getMentionedJid(message);

            if (!targetJid && args.length) {

                const number =
                    normalizeNumber(args[0]);

                if (
                    number.length >= 7 &&
                    number.length <= 15
                ) {
                    targetJid =
                        `${number}@s.whatsapp.net`;
                }
            }

            // ===============================
            // VALIDATE TARGET
            // ===============================

            if (!targetJid) {
                return await reply(`
╔══════════════════════════════╗
║        ➕ ADD MEMBER         ║
╚══════════════════════════════╝

Usage:

${config.PREFIX}add 2567XXXXXXXX

Example:

${config.PREFIX}add 256700000000

⚠️ Use the full international number
without the + symbol.

> ${config.BOT_NAME}
`);
            }

            const targetNumber =
                normalizeNumber(targetJid);

            // ===============================
            // PREVENT DUPLICATE
            // ===============================

            const alreadyMember =
                participants.some(
                    participant =>
                        normalizeNumber(
                            participant.id
                        ) === targetNumber
                );

            if (alreadyMember) {
                return await reply(
                    "❌ That user is already in this group."
                );
            }

            // ===============================
            // ADD USER
            // ===============================

            const result =
                await sock.groupParticipantsUpdate(
                    from,
                    [targetJid],
                    "add"
                );

            // ===============================
            // CHECK RESULT
            // ===============================

            const update =
                Array.isArray(result)
                    ? result[0]
                    : null;

            const status =
                update?.status;

            if (
                status &&
                status !== "200"
            ) {
                return await reply(`
⚠️ Unable to add @${targetNumber}.

Possible reasons:

• Privacy settings prevent group adds.
• The number is not registered on WhatsApp.
• The user blocked the bot.
• WhatsApp rejected the request.

Status: ${status}
`);
            }

            await react("➕");

            await sock.sendMessage(
                from,
                {
                    text: `
╔══════════════════════════════╗
║       ➕ MEMBER ADDED        ║
╚══════════════════════════════╝

Successfully added:

@${targetNumber}

Action performed by:

@${senderNumber}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`,
                    mentions: [
                        targetJid,
                        sender
                    ]
                }
            );

        } catch (error) {

            console.error(
                "[ADD COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to add that user. Check the number and make sure the bot is a group admin."
                );
            } catch {}
        }
    }
};