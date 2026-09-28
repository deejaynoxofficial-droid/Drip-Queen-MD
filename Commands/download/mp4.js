const config = require('../../config');
const fs = require('fs').promises;
const { download, cleanup } = require('../../lib/youtubeMedia');

module.exports = {
    name: 'mp4',
    aliases: ['ytmp4', 'video', 'ytvideo', 'youtubevideo', 'youtubevid'],
    category: 'Download',
    description: 'Download YouTube video as MP4',
    usage: '.mp4 <video name or YouTube URL>',

    async execute(context) {
        const { sock, msg, args, prefix } = context;
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: `╭━━〔 🎬 YOUTUBE MP4 〕━━╮\n┃\n┃ Enter a video name or YouTube URL.\n┃\n┃ Example: ${prefix}mp4 Burna Boy City Boys\n┃\n╰━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, {
            text: `╭━━〔 🎬 YOUTUBE MP4 〕━━╮\n┃ 🔎 Searching YouTube...\n┃ 🎥 ${query}\n┃ ⏳ Downloading...\n╰━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

        let media;
        try {
            media = await download(query, 'video');
            const buffer = await fs.readFile(media.path);
            await sock.sendMessage(chatId, {
                video: buffer,
                mimetype: media.mime,
                fileName: media.filename,
                caption: `🎬 ${media.title}\n\n🤖 ${config.BOT_NAME}`
            }, { quoted: msg });
        } catch (error) {
            console.error('[MP4 ERROR]', error.stack || error.message);
            await sock.sendMessage(chatId, {
                text: `╭━━〔 ❌ MP4 ERROR 〕━━╮\n┃ ${error.message}\n┃\n┃ Please try another YouTube URL/title.\n╰━━━━━━━━━━━━━━━━━━╯\n🤖 ${config.BOT_NAME}`
            }, { quoted: msg });
        } finally {
            await cleanup(media);
        }
    }
};
