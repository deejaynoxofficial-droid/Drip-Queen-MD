const config = require("../../config");
const { getGroupInfo, requireGroup, requireAdmin } = require("../../lib/groupUtils");
const { get } = require("../../lib/groupProtection");

module.exports = {
    name: "protection",
    aliases: ["protect"],
    category: "Protection",
    description: "Show group protection settings",
    async execute({ sock, reply, isGroup, from, sender, isOwner }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        const p = get(from);
        const row = (icon, label, key) => `│ ${icon} ${label.padEnd(13)} ${p[key] ? "🟢 ON" : "🔴 OFF"}`;
        return reply(
            `╭━━〔 🛡️ PROTECTION 〕━━╮\n` +
            `${row("🚫","Anti Spam","antispam")}\n` +
            `${row("🌊","Anti Flood","antiflood")}\n` +
            `${row("🤖","Anti Bot","antibot")}\n` +
            `${row("📣","Anti Mention","antimention")}\n` +
            `${row("🏷️","Anti Tag","antitag")}\n` +
            `${row("🔞","Anti NSFW","antinsfw")}\n` +
            `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `Use .antispam on/off etc.\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`
        );
    }
};
