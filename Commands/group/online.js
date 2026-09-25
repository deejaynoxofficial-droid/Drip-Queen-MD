"use strict";

const config = require("../../config");

/*
 * Drip Queen MD - Group Online Members
 *
 * WhatsApp does not provide a guaranteed complete "who is online right now"
 * roster. This command subscribes to the group's participants, listens for
 * fresh presence updates, resolves phone/LID aliases, and mentions the users
 * whose presence is currently available/typing/recording.
 */

module.exports = {
    name: "online",
    aliases: ["onlinemembers", "gonline"],
    category: "Group",
    description: "Mention currently detected online members in the group",

    async execute(context) {
        const { sock, reply, isGroup, from } = context;

        if (!isGroup) {
            return reply("❌ This command can only be used in a group.");
        }

        if (!sock?.ev || typeof sock.groupMetadata !== "function") {
            return reply("❌ Online-member service is unavailable.");
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const participants = Array.isArray(metadata?.participants)
                ? metadata.participants
                : [];

            if (!participants.length) {
                return reply("❌ No group members were found.");
            }

            const botIds = new Set([
                sock.user?.id,
                sock.user?.lid,
                sock.user?.jid
            ].filter(Boolean).map(normalizeJid));

            const participantByAlias = new Map();
            const subscriptions = new Set();

            for (const participant of participants) {
                const ids = [
                    participant?.id,
                    participant?.jid,
                    participant?.lid
                ].filter(Boolean);

                for (const id of ids) {
                    const key = normalizeJid(id);
                    if (!key) continue;
                    participantByAlias.set(key, participant);
                    subscriptions.add(id);
                }
            }

            const detected = new Map();

            const isOnline = presence =>
                presence === "available" ||
                presence === "composing" ||
                presence === "recording";

            const onPresence = event => {
                if (!event) return;

                const eventGroup = normalizeJid(event.id);
                if (eventGroup !== normalizeJid(from)) return;

                const presences = event.presences || {};

                for (const [jid, data] of Object.entries(presences)) {
                    const presence = data?.lastKnownPresence;
                    const participant = findParticipant(
                        jid,
                        participantByAlias,
                        participants
                    );

                    if (!participant) continue;

                    const memberIds = [
                        participant?.id,
                        participant?.jid,
                        participant?.lid
                    ].filter(Boolean);

                    const isBot = memberIds.some(id =>
                        botIds.has(normalizeJid(id))
                    );

                    if (isBot) continue;

                    const mentionJid = getMentionJid(participant);
                    if (!mentionJid) continue;

                    if (isOnline(presence)) {
                        detected.set(normalizeJid(mentionJid), {
                            jid: mentionJid,
                            presence,
                            participant
                        });
                    } else if (
                        presence === "unavailable" ||
                        presence === "paused"
                    ) {
                        detected.delete(normalizeJid(mentionJid));
                    }
                }
            };

            // Attach the listener BEFORE subscribing so the first presence
            // response cannot be missed.
            sock.ev.on("presence.update", onPresence);

            try {
                await Promise.all(
                    [...subscriptions].map(async jid => {
                        try {
                            await sock.presenceSubscribe(jid);
                        } catch (_) {
                            // Some WhatsApp JID forms cannot be subscribed to.
                        }
                    })
                );

                // Presence replies are asynchronous. Give WhatsApp enough time
                // to send the initial state for subscribed members.
                await delay(6000);
            } finally {
                try {
                    sock.ev.off("presence.update", onPresence);
                } catch (_) {}
            }

            const members = [...detected.values()];

            const mentions = members.map(member => member.jid);

            if (!mentions.length) {
                return reply(
                    `╭━━〔 🟢 ONLINE MEMBERS 〕━━╮\n` +
                    `│\n` +
                    `│ 💤 No online members were detected.\n` +
                    `│\n` +
                    `│ ℹ️ WhatsApp only reports presence\n` +
                    `│ when it is available to this session.\n` +
                    `│\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    `${footer()}`
                );
            }

            const lines = members.map((member, index) => {
                const label =
                    member.presence === "composing"
                        ? "⌨️ typing"
                        : member.presence === "recording"
                            ? "🎙️ recording"
                            : "🟢 online";

                return `${index + 1}. ${label} @${member.jid.split("@")[0]}`;
            });

            const message =
                `╭━━〔 🟢 ONLINE MEMBERS 〕━━╮\n` +
                `│ 👥 Detected: ${members.length}\n` +
                `│\n` +
                lines.map(line => `│ ${line}`).join("\n") +
                `\n│\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                footer();

            return reply(message, { mentions });
        } catch (error) {
            console.error("[ONLINE] Error:", error.stack || error.message);
            return reply(
                `❌ Failed to check group presence.\n\n${footer()}`
            );
        }
    }
};

function normalizeJid(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .split(":")[0];
}

function findParticipant(jid, aliasMap, participants) {
    const key = normalizeJid(jid);
    if (!key) return null;

    const direct = aliasMap.get(key);
    if (direct) return direct;

    const number = key.split("@")[0];

    return participants.find(participant =>
        [participant?.id, participant?.jid, participant?.lid]
            .filter(Boolean)
            .some(id => normalizeJid(id).split("@")[0] === number)
    ) || null;
}

function getMentionJid(participant) {
    // Prefer the normal WhatsApp user JID for mentions when available.
    return participant?.jid || participant?.id || participant?.lid || null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function footer() {
    return `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
}
