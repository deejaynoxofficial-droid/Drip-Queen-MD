const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "revoke",
    aliases: ["revokeinvite", "resetlink"],
    category: "Group",
    description: "Revoke and replace the group invite link",
    async execute({ sock, reply, isGroup, from, sender, isOwner }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        try {
            await sock.groupRevokeInvite(from);
            const code = await sock.groupInviteCode(from);
            return reply(`♻️ Group invite link revoked and replaced.\n\n🔗 https://chat.whatsapp.com/${code}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch {
            return reply("❌ Failed to revoke the invite link.");
        }
    }
};
