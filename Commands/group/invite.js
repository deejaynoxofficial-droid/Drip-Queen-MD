const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "invite",
    aliases: ["grouplink", "link"],
    category: "Group",
    description: "Get the group invite link",
    async execute({ sock, reply, isGroup, from, sender, isOwner }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        try {
            const code = await sock.groupInviteCode(from);
            return reply(`🔗 https://chat.whatsapp.com/${code}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch {
            return reply("❌ Failed to get the group invite link.");
        }
    }
};
