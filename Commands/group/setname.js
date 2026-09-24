const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "setname",
    aliases: ["groupname"],
    category: "Group",
    description: "Change the group subject",
    async execute({ sock, reply, isGroup, from, sender, isOwner, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const name = args.join(" ").trim();
        if (!name) return reply("Usage: .setname New Group Name");
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        try {
            await sock.groupUpdateSubject(from, name.slice(0, 100));
            return reply(`✅ Group name changed to: ${name.slice(0, 100)}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch {
            return reply("❌ Failed to change the group name.");
        }
    }
};
