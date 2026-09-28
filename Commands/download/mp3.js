const config = require('../../config');
const fs = require('fs').promises;
const { download, cleanup } = require('../../lib/youtubeMedia');

module.exports = {
    name: 'mp3',
    aliases: ['ytmp3', 'song', 'ytaudio', 'youtubeaudio', 'ytmusic'],
    category: 'Download',
    description: 'Download YouTube audio as MP3',
    usage: '.mp3 <song name or YouTube URL>',

    async execute(context) {
        const { sock, msg, args, prefix } = context;
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: `╭━━〔 🎵 YOUTUBE MP3 〕━━╮\n┃\n┃ Enter a song name or YouTube URL.\n┃\n┃ Example: ${prefix}mp3 Burna Boy City Boys\n┃\n╰━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, {
            text: `╭━━〔 🎵 YOUTUBE MP3 〕━━╮\n┃ 🔎 Searching YouTube...\n┃ 🎧 ${query}\n┃ ⏳ Downloading...\n╰━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

        let media;
        try {
            media = await download(query, 'audio');
            const buffer = await fs.readFile(media.path);
            await sock.sendMessage(chatId, {
                audio: buffer,
                mimetype: media.mime,
                fileName: media.filename,
                ptt: false
            }, { quoted: msg });
        } catch (error) {
            console.error('[MP3 ERROR]', error.stack || error.message);
            await sock.sendMessage(chatId, {
                text: `╭━━〔 ❌ MP3 ERROR 〕━━╮\n┃ ${error.message}\n┃\n┃ Please try another YouTube URL/title.\n╰━━━━━━━━━━━━━━━━━━╯\n🤖 ${config.BOT_NAME}`
            }, { quoted: msg });
        } finally {
            await cleanup(media);
        }
    }
};
