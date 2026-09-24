const config = require("../../config");

module.exports = {
    name: "online",
    aliases: ["onlinemembers"],
    category: "Group",
    description: "Show currently detected online group members",

    async execute(context) {
        const {
            sock,
            reply,
            isGroup,
            from
        } = context;

        if (!isGroup) {
            return reply("❌ This command can only be used in a group.");
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants || [];

            if (!participants.length) {
                return reply("❌ No group members were found.");
            }

            /*
             * Baileys does not expose a guaranteed complete real-time
             * online roster. We subscribe to the group's participants and
             * collect presence updates that arrive for this command.
             */
            const online = new Map();

            const isOnlinePresence = (presence) =>
                presence === "available" ||
                presence === "composing" ||
                presence === "recording";

            const onPresence = (event) => {
                if (!event || event.id !== from) return;

                const presences = event.presences || {};

                for (const [jid, data] of Object.entries(presences)) {
                    const normalized =
                        jid.split(":")[0].replace(/@lid$/, "@lid");

                    const presence = data?.lastKnownPresence;

                    if (isOnlinePresence(presence)) {
                        online.set(normalized, presence);
                    } else if (presence === "unavailable" || presence === "paused") {
                        online.delete(normalized);
                    }
                }
            };

            sock.ev.on("presence.update", onPresence);

            // Ask WhatsApp/Baileys for fresh presence information.
            await Promise.all(
                participants.map(async (participant) => {
                    try {
                        await sock.presenceSubscribe(participant.id);
                    } catch (_) {
                        // Some JIDs may not support presence subscription.
                    }
                })
            );

            // Give presence updates a short window to arrive.
            await new Promise(resolve => setTimeout(resolve, 1800));

            sock.ev.off("presence.update", onPresence);

            const participantMap = new Map(
                participants.map(participant => [
                    participant.id.split(":")[0],
                    participant
                ])
            );

            const detected = [];

            for (const [jid, presence] of online) {
                const baseJid = jid.split(":")[0];
                const participant =
                    participantMap.get(baseJid) ||
                    participants.find(p =>
                        p.id === jid ||
                        p.id.split(":")[0] === baseJid
                    );

                if (!participant) continue;

                detected.push({
                    jid: participant.id,
                    presence
                });
            }

            const lines = detected.map((member, index) => {
                const label =
                    member.presence === "composing"
                        ? "⌨️ typing"
                        : member.presence === "recording"
                            ? "🎙️ recording"
                            : "🟢 online";

                return `${index + 1}. ${label} @${member.jid.split("@")[0]}`;
            });

            const footer =
                `> ${config.BOT_NAME}\n` +
                `> Powered by ${config.CREATOR}`;

            if (!lines.length) {
                return reply(
                    `╭━━〔 🟢 ONLINE MEMBERS 〕━━╮\n` +
                    `│\n` +
                    `│ 💤 No online members detected.\n` +
                    `│\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    footer
                );
            }

            const text =
                `╭━━〔 🟢 ONLINE MEMBERS 〕━━╮\n` +
                `│ 👥 Detected: ${lines.length}\n` +
                `│\n` +
                lines.map(line => `│ ${line}`).join("\n") +
                `\n│\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                footer;

            await reply(
                text,
                {
                    mentions: detected.map(member => member.jid)
                }
            );

        } catch (error) {
            console.error("[ONLINE] Error:", error);

            return reply(
                "❌ Failed to check group presence. Please try again."
            );
        }
    }
};
