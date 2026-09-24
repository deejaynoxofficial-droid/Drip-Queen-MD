const config = require("../../config");
const { getGroupInfo, requireGroup, requireAdmin } = require("../../lib/groupUtils");
const { get, set } = require("../../lib/groupProtection");

module.exports = {
    name: "antinsfw",
    aliases: [],
    category: "Protection",
    description: "Toggle NSFW protection",
    async execute({ sock, reply, isGroup, from, sender, isOwner, args }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        const current = get(from);
        const value = String(args[0] || "").toLowerCase();
        if (!["on","off","status"].includes(value)) {
            return reply(`Usage: .antinsfw on|off|status\nCurrent: ${current.antinsfw ? "🟢 ON" : "🔴 OFF"}`);
        }
        if (value === "status") {
            return reply(`🛡️ ANTINSFW : ${current.antinsfw ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        }
        const updated = set(from, "antinsfw", value === "on");
        return reply(`🛡️ ANTINSFW : ${updated.antinsfw ? "🟢 ON" : "🔴 OFF"}\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
    }
};
