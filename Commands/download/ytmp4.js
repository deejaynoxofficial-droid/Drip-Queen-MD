const config = require("../../config");
const { getDownload, downloadBuffer } = require("../../lib/ytApi");

module.exports = {
    name: "ytmp4",
    aliases: ["ytvideo", "youtubevideo", "youtubevid"],
    category: "Download",
    description: "Search and download YouTube video using YT-API",
    usage: ".ytmp4 <video name>",

    async execute(context) {
        const { sock, msg, args, prefix } = context;
        const chatId = msg.key.remoteJid;
        const query = args.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `╭─〔 🎬 YOUTUBE MP4 〕
│
│ Please enter a song or video name.
│
│ Example:
│ ${prefix}ytmp4 Burna Boy City Boys
│
╰───────────────`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, {
                text: `╭─〔 🎬 YOUTUBE MP4 〕
│
│ 🔎 Searching YouTube...
│
│ ${query}
│
│ ⏳ Downloading...
│
╰───────────────`
            }, { quoted: msg });

            const result = await getDownload(query, "video");
            const file = await downloadBuffer(result.url);
            const caption = `🎬 *${result.title}*\n\n🤖 ${config.BOT_NAME}`;

            return await sock.sendMessage(chatId, {
                video: file.buffer,
                mimetype: result.mimeType || "video/mp4",
                fileName: `${String(result.title).replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "download"}.mp4`,
                caption
            }, { quoted: msg });
        } catch (error) {
            console.error("[ytmp4 COMMAND ERROR]", error.message);
            return await sock.sendMessage(chatId, {
                text: `╭─〔 ❌ MP4 ERROR 〕
│
│ ${error.message}
│
│ Please try again later.
│
╰───────────────`
            }, { quoted: msg });
        }
    }
};
