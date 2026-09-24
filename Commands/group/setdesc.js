const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "setdesc",
    aliases: ["groupdesc"],
    category: "Group",
    description: "Change the group description",
    async execute({ sock, reply, isGroup, from, sender, isOwner, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const desc = args.join(" ").trim();
        if (!desc) return reply("Usage: .setdesc New group description");
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        try {
            await sock.groupUpdateDescription(from, desc.slice(0, 4096));
            return reply(`✅ Group description updated.\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch {
            return reply("❌ Failed to update the group description.");
        }
    }
};
