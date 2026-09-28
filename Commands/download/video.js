const config = require('../../config');
const { download, cleanup } = require('../../lib/youtubeMedia');

module.exports = {
    name: 'ytmp4',
    aliases: ['ytvideo', 'youtubevideo', 'youtubevid'],
    category: 'Download',
    description: 'Search and download YouTube video',
    usage: '.ytmp4 <video name or YouTube URL>',

    async execute(context) {
        const { sock, msg, args, prefix } = context;
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { text: `╭─〔 🎬 YOUTUBE MP4 〕\n│\n│ Enter a video name or YouTube URL.\n│\n│ Example:\n│ ${prefix}ytmp4 Burna Boy City Boys\n│\n╰───────────────` }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { text: `╭─〔 🎬 YOUTUBE MP4 〕\n│\n│ 🔎 Searching YouTube...\n│ 🎥 ${query}\n│ ⏳ Downloading...\n│\n╰───────────────` }, { quoted: msg });

        let media;
        try {
            media = await download(query, 'video');
            const buffer = await require('fs').promises.readFile(media.path);
            await sock.sendMessage(chatId, {
                video: buffer,
                mimetype: media.mime,
                fileName: media.filename,
                caption: `🎬 ${media.title}\n\n🤖 ${config.BOT_NAME}`
            }, { quoted: msg });
        } catch (error) {
            console.error('[YTMP4 ERROR]', error.stack || error.message);
            await sock.sendMessage(chatId, {
                text: `╭─〔 ❌ MP4 ERROR 〕\n│\n│ ${error.message}\n│\n│ The YouTube downloader retried\n│ multiple compatible clients.\n│\n╰───────────────\n🤖 ${config.BOT_NAME}`
            }, { quoted: msg });
        } finally {
            await cleanup(media);
        }
    }
};
