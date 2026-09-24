const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "unlock",
    aliases: ["unlockgroup"],
    category: "Group",
    description: "Allow members to edit group info",
    async execute({ sock, reply, isGroup, from, sender, isOwner }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        try {
            await sock.groupSettingUpdate(from, "unlocked");
            return reply(`🔓 Group info unlocked.\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch {
            return reply("❌ Failed to unlock group info.");
        }
    }
};
