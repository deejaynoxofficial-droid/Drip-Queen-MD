const config = require('../../config');
const { download, cleanup } = require('../../lib/youtubeMedia');

module.exports = {
    name: 'ytmp3',
    aliases: ['ytaudio', 'youtubeaudio', 'ytmusic'],
    category: 'Download',
    description: 'Search and download YouTube audio',
    usage: '.ytmp3 <song or YouTube URL>',

    async execute(context) {
        const { sock, msg, args, prefix } = context;
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { text: `╭─〔 🎵 YOUTUBE MP3 〕\n│\n│ Enter a song name or YouTube URL.\n│\n│ Example:\n│ ${prefix}ytmp3 Burna Boy City Boys\n│\n╰───────────────` }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { text: `╭─〔 🎵 YOUTUBE MP3 〕\n│\n│ 🔎 Searching YouTube...\n│ 🎧 ${query}\n│ ⏳ Downloading...\n│\n╰───────────────` }, { quoted: msg });

        let media;
        try {
            media = await download(query, 'audio');
            const buffer = await require('fs').promises.readFile(media.path);
            await sock.sendMessage(chatId, {
                audio: buffer,
                mimetype: media.mime,
                fileName: media.filename,
                ptt: false
            }, { quoted: msg });
        } catch (error) {
            console.error('[YTMP3 ERROR]', error.stack || error.message);
            await sock.sendMessage(chatId, {
                text: `╭─〔 ❌ MP3 ERROR 〕\n│\n│ ${error.message}\n│\n│ The YouTube downloader retried\n│ multiple compatible clients.\n│\n╰───────────────\n🤖 ${config.BOT_NAME}`
            }, { quoted: msg });
        } finally {
            await cleanup(media);
        }
    }
};
