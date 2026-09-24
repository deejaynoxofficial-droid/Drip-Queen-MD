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
    name: "resetwarn",
    aliases: ["clearwarn", "unwarn"],
    category: "Moderation",
    description: "Reset a member's warnings",
    async execute({ reply, isGroup, from, sender, isOwner, quoted, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const target = targetJid(quoted, args, sender);
        set(from, target, 0);
        const footer = `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
        return reply(`✅ Warnings reset for @${target.split("@")[0]}.\n\n${footer}`, { mentions: [target] });
    }
};
