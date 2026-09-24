const config = require("../../config");
const { getGroupInfo, requireGroup, requireAdmin } = require("../../lib/groupUtils");
const { get, set } = require("../../lib/groupProtection");

module.exports = {
    name: "antimention",
    aliases: [],
    category: "Protection",
    description: "Toggle protection against excessive mentions",
    async execute({ sock, reply, isGroup, from, sender, isOwner, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        const current = get(from);
        const value = String(args[0] || "").toLowerCase();
        if (!["on","off","status"].includes(value)) {
            return reply(`Usage: .antimention on|off|status\nCurrent: ${current.antimention ? "🟢 ON" : "🔴 OFF"}`);
        }
        if (value === "status") {
            return reply(`🛡️ ANTIMENTION : ${current.antimention ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        }
        const updated = set(from, "antimention", value === "on");
        return reply(`🛡️ ANTIMENTION : ${updated.antimention ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
    }
};
