const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "delete",
    aliases: ["del", "remove"],
    category: "Moderation",
    description: "Delete a replied message",
    async execute({ sock, reply, isGroup, from, sender, isOwner, msg }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        const quotedKey = msg?.message?.extendedTextMessage?.contextInfo?.stanzaId
            ? {
                remoteJid: from,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                participant: msg.message.extendedTextMessage.contextInfo.participant,
                fromMe: false
            }
            : null;
        if (!quotedKey) return reply("🗑️ Reply to the message you want me to delete.");
        try {
            await sock.sendMessage(from, { delete: quotedKey });
        } catch {
            return reply("❌ Failed to delete that message.");
        }
    }
};
