const config = require("../../config");
const { get, set } = require("../../lib/warnings");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

function targetJid(quoted, args, sender) {
    const q = quoted?.key?.participant;
    if (q) return q;
    const n = String(args?.[0] || "").replace(/[^\d]/g, "");
    return n ? `${n}@s.whatsapp.net` : sender;
}

module.exports = {
    name: "warnings",
    aliases: ["warns"],
    category: "Moderation",
    description: "Show a member's warning count",
    async execute({ reply, isGroup, from, sender, quoted, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const target = targetJid(quoted, args, sender);
        const count = get(from, target);
        const footer = `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
        return reply(`⚠️ @${target.split("@")[0]} has ${count} warning(s).\n\n${footer}`, { mentions: [target] });
    }
};
