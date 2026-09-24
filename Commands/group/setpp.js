const config = require("../../config");
const { requireGroup, getGroupInfo, requireAdmin, requireBotAdmin } = require("../../lib/groupUtils");

module.exports = {
    name: "setpp",
    aliases: ["setgrouppp", "setgroupicon"],
    category: "Group",
    description: "Set group picture from a replied image",
    async execute({ sock, reply, isGroup, from, sender, isOwner, quoted, msg }) {
        if (!requireGroup(isGroup, reply)) return;
        const metadata = await getGroupInfo(sock, from);
        if (!requireAdmin(metadata, sender, reply, isOwner)) return;
        if (!requireBotAdmin(metadata, sock, reply)) return;
        const imageMessage = quoted?.imageMessage || msg?.message?.imageMessage;
        if (!imageMessage) return reply("🖼️ Reply to an image with .setpp");
        try {
            const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
            const stream = await downloadContentFromMessage(imageMessage, "image");
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            await sock.updateProfilePicture(from, Buffer.concat(chunks));
            return reply(`✅ Group picture updated.\n\n> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`);
        } catch (e) {
            console.error("[SETPP]", e.message);
            return reply("❌ Failed to update the group picture.");
        }
    }
};
