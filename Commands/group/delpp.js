const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "delpp",
    aliases: ["removepp", "deletepp"],
    category: "Group",
    description: "Remove the group picture",
    async execute({ sock, reply, isGroup, from, sender, isOwner }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        try {
            await sock.removeProfilePicture(from);
            return reply(`✅ Group picture removed.\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch {
            return reply("❌ Failed to remove the group picture.");
        }
    }
};
