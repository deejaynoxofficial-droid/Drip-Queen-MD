const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "unmute",
    aliases: ["open"],
    category: "Group",
    description: "Allow all members to send messages",
    async execute({ sock, reply, isGroup, from, sender, isOwner }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        try {
            await sock.groupSettingUpdate(from, "not_announcement");
            return reply(`🔊 Group opened. All members can send messages.\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch {
            return reply("❌ Failed to unmute the group.");
        }
    }
};
