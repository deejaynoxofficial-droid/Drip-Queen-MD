"use strict";

const config = require("../../config");

/*
 * Drip Queen MD - Group Online Members
 *
 * Presence is privacy/session dependent: WhatsApp does not expose a guaranteed
 * complete real-time roster. We therefore inspect every group participant,
 * subscribe to every available JID/LID alias, collect fresh presence events,
 * and only report members for whom this session received an active presence.
 */

module.exports = {
    name: "online",
    aliases: ["onlinemembers", "gonline"],
    category: "Group",
    description: "Inspect all group members and show currently detected online members",

    async execute(context) {
        const { sock, reply, isGroup, from } = context;

        if (!isGroup) {
            return reply("❌ This command can only be used in a group.");
        }

        if (!sock?.ev || typeof sock.groupMetadata !== "function" ||
            typeof sock.presenceSubscribe !== "function") {
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

            const groupJid = normalizeJid(from);
            const botIds = new Set([
                sock.user?.id,
                sock.user?.lid,
                sock.user?.jid
            ].filter(Boolean).map(normalizeJid));

            // Build a complete alias table before subscribing so LID/phone
            // presence events can always be mapped back to a group member.
            const participantByAlias = new Map();
            const subscriptions = new Set();

            for (const participant of participants) {
                for (const id of getParticipantIds(participant)) {
                    const normalized = normalizeJid(id);
                    if (!normalized) continue;
                    participantByAlias.set(normalized, participant);
                    subscriptions.add(id);
                }
            }

            // Keep the latest state received for every participant. This also
            // means an unavailable event can remove a member after an earlier
            // available event.
            const detected = new Map();
            const inspected = new Set();

            const activePresences = new Set([
                "available",
                "composing",
                "recording"
            ]);
            const inactivePresences = new Set([
                "unavailable",
                "paused"
            ]);

            const onPresence = event => {
                if (!event || normalizeJid(event.id) !== groupJid) return;

                const presences = event.presences || {};
                for (const [jid, data] of Object.entries(presences)) {
                    const participant = findParticipant(
                        jid,
                        participantByAlias,
                        participants
                    );
                    if (!participant) continue;

                    const memberIds = getParticipantIds(participant);
                    const isBot = memberIds.some(id =>
                        botIds.has(normalizeJid(id))
                    );
                    if (isBot) continue;

                    const mentionJid = getMentionJid(participant);
                    if (!mentionJid) continue;

                    const key = normalizeJid(mentionJid);
                    const presence = String(data?.lastKnownPresence || "").toLowerCase();
                    inspected.add(key);

                    if (activePresences.has(presence)) {
                        detected.set(key, {
                            jid: mentionJid,
                            presence,
                            participant
                        });
                    } else if (inactivePresences.has(presence)) {
                        detected.delete(key);
                    }
                }
            };

            sock.ev.on("presence.update", onPresence);

            try {
                // Subscribe to EVERY participant alias. Some groups expose
                // phone JIDs while others expose LIDs, so both are attempted.
                await Promise.allSettled(
                    [...subscriptions].map(async jid => {
                        try {
                            await sock.presenceSubscribe(jid);
                        } catch (_) {
                            // Unsupported/stale JID forms are harmless.
                        }
                    })
                );

                // Presence is asynchronous. Keep the listener alive long enough
                // for the initial responses instead of the old short window.
                await delay(9000);
            } finally {
                try {
                    sock.ev.off("presence.update", onPresence);
                } catch (_) {}
            }

            const members = [...detected.values()]
                .sort((a, b) => String(a.jid).localeCompare(String(b.jid)));

            const mentions = members.map(member => member.jid);
            const inspectable = participants.filter(participant => {
                const ids = getParticipantIds(participant);
                return !ids.some(id => botIds.has(normalizeJid(id)));
            }).length;

            if (!mentions.length) {
                return reply(
                    `╭━━〔 🔎 GROUP PRESENCE SCAN 〕━━╮\n` +
                    `│ 👥 Members inspected: ${inspectable}\n` +
                    `│ 🟢 Online detected: 0\n` +
                    `│\n` +
                    `│ 💤 No active presence was returned.\n` +
                    `│\n` +
                    `│ ℹ️ WhatsApp presence is privacy/session\n` +
                    `│ dependent, so a member may be online\n` +
                    `│ without this session receiving a signal.\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    footer()
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
                `╭━━〔 🔎 GROUP PRESENCE SCAN 〕━━╮\n` +
                `│ 👥 Members inspected: ${inspectable}\n` +
                `│ 🟢 Online detected: ${members.length}\n` +
                `│\n` +
                lines.map(line => `│ ${line}`).join("\n") +
                `\n│\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                footer();

            return reply(message, { mentions });
        } catch (error) {
            console.error("[ONLINE] Error:", error.stack || error.message);
            return reply(
                `❌ Failed to inspect group presence.\n\n${footer()}`
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

function getParticipantIds(participant) {
    return [
        participant?.id,
        participant?.jid,
        participant?.lid
    ].filter(Boolean);
}

function findParticipant(jid, aliasMap, participants) {
    const key = normalizeJid(jid);
    if (!key) return null;

    const direct = aliasMap.get(key);
    if (direct) return direct;

    const number = key.split("@")[0];
    return participants.find(participant =>
        getParticipantIds(participant).some(id =>
            normalizeJid(id).split("@")[0] === number
        )
    ) || null;
}

function getMentionJid(participant) {
    return participant?.jid || participant?.id || participant?.lid || null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function footer() {
    return `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
}
