const config = require("../../config");
const { requireGroup, getGroupInfo } = require("../../lib/groupUtils");

module.exports = {
    name: "members",
    aliases: ["memberlist", "grouplist"],
    category: "Group",
    description: "Show group member list",
    async execute({ sock, reply, isGroup, from }) {
        if (!requireGroup(isGroup, reply)) return;
        try {
            const metadata = await getGroupInfo(sock, from);
            const members = metadata.participants || [];
            const lines = members.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`);
            const footer = `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
            // Keep very large groups manageable.
            const shown = lines.slice(0, 150);
            const extra = lines.length > 150 ? `\n│ … and ${lines.length - 150} more` : "";
            return reply(
                `╭━━〔 👥 GROUP MEMBERS 〕━━╮\n│ Total: ${members.length}\n│\n${shown.map(x=>`│ ${x}`).join("\n")}${extra}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n${footer}`,
                { mentions: members.slice(0, 150).map(p => p.id) }
            );
        } catch {
            return reply("❌ Failed to read group members.");
        }
    }
};
