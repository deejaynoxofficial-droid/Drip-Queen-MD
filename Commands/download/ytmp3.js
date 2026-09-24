const config = require("../../config");
const { getDownload, downloadBuffer } = require("../../lib/ytApi");

module.exports = {
    name: "ytmp3",
    aliases: ["ytaudio", "youtubeaudio", "ytmusic"],
    category: "Download",
    description: "Search and download YouTube audio using YT-API",
    usage: ".ytmp3 <song or video name>",

    async execute(context) {
        const { sock, msg, args, prefix } = context;
        const chatId = msg.key.remoteJid;
        const query = args.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `╭─〔 🎵 YOUTUBE MP3 〕
│
│ Please enter a song or video name.
│
│ Example:
│ ${prefix}ytmp3 Burna Boy City Boys
│
╰───────────────`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, {
                text: `╭─〔 🎵 YOUTUBE MP3 〕
│
│ 🔎 Searching YouTube...
│
│ ${query}
│
│ ⏳ Downloading...
│
╰───────────────`
            }, { quoted: msg });

            const result = await getDownload(query, "audio");
            const file = await downloadBuffer(result.url);
            const caption = `🎬 *${result.title}*\n\n🤖 ${config.BOT_NAME}`;

            return await sock.sendMessage(chatId, {
                audio: file.buffer,
                mimetype: result.mimeType || "audio/mpeg",
                fileName: `${String(result.title).replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "download"}.mp3`,
                caption
            }, { quoted: msg });
        } catch (error) {
            console.error("[ytmp3 COMMAND ERROR]", error.message);
            return await sock.sendMessage(chatId, {
                text: `╭─〔 ❌ MP3 ERROR 〕
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
