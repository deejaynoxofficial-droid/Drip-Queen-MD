const config = require("../../config");
const { requireGroup, getGroupInfo, isAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "admins",
    aliases: ["groupadmins", "staff"],
    category: "Group",
    description: "List group administrators",
    async execute({ sock, reply, isGroup, from }) {
        if (!requireGroup(isGroup, reply)) return;
        try {
            const metadata = await getGroupInfo(sock, from);
            const admins = metadata.participants.filter(isAdmin);
            const mentions = admins.map(p => p.id);
            const lines = admins.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`);
            const footer = `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
            return reply(
                `╭━━〔 👑 GROUP ADMINS 〕━━╮\n│ 👥 Total: ${admins.length}\n│\n${lines.map(x=>`│ ${x}`).join("\n")}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n${footer}`,
                { mentions }
            );
        } catch {
            return reply("❌ Failed to read group administrators.");
        }
    }
};
