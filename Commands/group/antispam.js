const config = require("../../config");
const { getGroupInfo, requireGroup, requireAdmin } = require("../../lib/groupUtils");
const { get, set } = require("../../lib/groupProtection");

module.exports = {
    name: "antispam",
    aliases: [],
    category: "Protection",
    description: "Toggle group anti-spam protection",
    async execute({ sock, reply, isGroup, from, sender, isOwner, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        const current = get(from);
        const value = String(args[0] || "").toLowerCase();
        if (!["on","off","status"].includes(value)) {
            return reply(`Usage: .antispam on|off|status\nCurrent: ${current.antispam ? "🟢 ON" : "🔴 OFF"}`);
        }
        if (value === "status") {
            return reply(`🛡️ ANTISPAM : ${current.antispam ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        }
        const updated = set(from, "antispam", value === "on");
        return reply(`🛡️ ANTISPAM : ${updated.antispam ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
    }
};
