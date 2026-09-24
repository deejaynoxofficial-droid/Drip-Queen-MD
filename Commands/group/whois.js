const config = require("../../config");
const { requireGroup, getGroupInfo, isAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "whois",
    aliases: ["user", "profile"],
    category: "Group",
    description: "Show group information about a member",
    async execute({ sock, reply, isGroup, from, sender, quoted, args }) {
        if (!requireGroup(isGroup, reply)) return;
        try {
            const metadata = await getGroupInfo(sock, from);
            const target = quoted?.key?.participant || args[0]?.replace(/[^\d]/g, "");
            const jid = target?.includes("@") ? target : target ? `${target}@s.whatsapp.net` : sender;
            const participant = metadata.participants.find(p =>
                p.id === jid || p.id.split(":")[0] === jid.split(":")[0]
            );
            if (!participant) return reply("❌ User is not a member of this group.");
            const footer = `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
            return reply(
                `╭━━〔 👤 MEMBER INFO 〕━━╮\n│ 📱 Number: @${participant.id.split("@")[0]}\n│ 👑 Admin: ${isAdmin(participant) ? "Yes" : "No"}\n│ 🆔 JID: ${participant.id}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n${footer}`,
                { mentions: [participant.id] }
            );
        } catch {
            return reply("❌ Failed to find that member.");
        }
    }
};
