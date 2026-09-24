const config = require("../../config");
const { getGroupInfo, requireGroup, requireAdmin } = require("../../lib/groupUtils");
const { get, set } = require("../../lib/groupProtection");

module.exports = {
    name: "antibot",
    aliases: [],
    category: "Protection",
    description: "Toggle group anti-bot protection",
    async execute({ sock, reply, isGroup, from, sender, isOwner, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        const current = get(from);
        const value = String(args[0] || "").toLowerCase();
        if (!["on","off","status"].includes(value)) {
            return reply(`Usage: .antibot on|off|status\nCurrent: ${current.antibot ? "🟢 ON" : "🔴 OFF"}`);
        }
        if (value === "status") {
            return reply(`🛡️ ANTIBOT : ${current.antibot ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        }
        const updated = set(from, "antibot", value === "on");
        return reply(`🛡️ ANTIBOT : ${updated.antibot ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
    }
};
