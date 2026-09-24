const config = require("../../config");
const { get, set } = require("../../lib/warnings");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

function targetJid(quoted, args, sender) {
    const q = quoted?.key?.participant;
    if (q) return q;
    const n = String(args?.[0] || "").replace(/[^\d]/g, "");
    return n ? `${n}@s.whatsapp.net` : sender;
}

module.exports = {
    name: "warn",
    aliases: ["warning"],
    category: "Moderation",
    description: "Warn a group member",
    async execute({ sock, reply, isGroup, from, sender, isOwner, quoted, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        const target = targetJid(quoted, args, sender);
        const participant = metadata.participants.find(p => p.id === target || p.id.split(":")[0] === target.split(":")[0]);
        if (!participant) return reply("❌ Member not found.");
        if (participant.admin) return reply("❌ Admins cannot be warned.");
        const count = set(from, participant.id, get(from, participant.id) + 1);
        const footer = `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
        return reply(`⚠️ @${participant.id.split("@")[0]} has been warned.\n\n📊 Warnings: ${count}\n\n${footer}`, { mentions: [participant.id] });
    }
};
