const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const ytdlp = require('youtube-dl-exec');
const config = require('../config');

const execFileAsync = promisify(execFile);
const TEMP_DIR = config.DOWNLOAD?.TEMP_FOLDER || path.join(process.cwd(), 'temp');
const MAX_SIZE = Number(config.DOWNLOAD?.MAX_FILE_SIZE) || 50 * 1024 * 1024;

function isYouTubeUrl(value) {
    try {
        const u = new URL(value);
        return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname);
    } catch {
        return false;
    }
}

function safeName(value, fallback = 'media') {
    return String(value || fallback)
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || fallback;
}

async function runYtDlp(target, options) {
    const attempts = [
        {},
        { extractorArgs: 'youtube:player_client=android' },
        { extractorArgs: 'youtube:player_client=web_embedded' }
    ];

    let lastError;
    for (const fallback of attempts) {
        try {
            return await ytdlp(target, {
                noWarnings: true,
                noCallHome: true,
                noCheckCertificates: true,
                noPlaylist: true,
                ...options,
                ...fallback
            });
        } catch (error) {
            lastError = error;
            const combined = `${error?.stderr || ''} ${error?.message || ''}`;
            console.warn('[YOUTUBE] attempt failed:', combined.slice(0, 500));
            if (!/403|forbidden|format|SABR|unable to download/i.test(combined)) break;
        }
    }
    throw lastError || new Error('YouTube request failed');
}

async function search(query) {
    const target = isYouTubeUrl(query) ? query : `ytsearch1:${query}`;
    const info = await runYtDlp(target, {
        dumpSingleJson: true,
        skipDownload: true,
        flatPlaylist: false
    });

    const data = typeof info === 'string' ? JSON.parse(info) : info;
    const item = Array.isArray(data?.entries) ? data.entries[0] : data;
    if (!item || (!item.webpage_url && !item.url && !item.id)) {
        throw new Error('YouTube did not return a playable result.');
    }

    return {
        id: item.id,
        title: item.title || 'YouTube media',
        url: item.webpage_url || item.original_url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : item.url),
        duration: item.duration || 0,
        thumbnail: item.thumbnail || ''
    };
}

async function ensureTemp() {
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
}

async function download(query, type) {
    const media = await search(query);
    await ensureTemp();

    const id = crypto.randomBytes(8).toString('hex');
    const base = path.join(TEMP_DIR, `yt-${id}`);
    const raw = `${base}.%(ext)s`;

    if (type === 'audio') {
        const output = `${base}.m4a`;
        await runYtDlp(media.url, {
            format: 'bestaudio[ext=m4a]/bestaudio/best',
            output: raw,
            preferFreeFormats: true
        });

        let source = output;
        if (!fs.existsSync(source)) {
            const files = (await fs.promises.readdir(TEMP_DIR))
                .filter(f => f.startsWith(`yt-${id}.`))
                .map(f => path.join(TEMP_DIR, f));
            source = files[0];
        }
        if (!source || !fs.existsSync(source)) throw new Error('YouTube returned no audio file.');

        const mp3 = `${base}.mp3`;
        try {
            await execFileAsync('ffmpeg', ['-y', '-i', source, '-vn', '-codec:a', 'libmp3lame', '-q:a', '4', mp3], { timeout: 120000 });
            await fs.promises.unlink(source).catch(() => {});
            source = mp3;
        } catch (error) {
            console.warn('[YOUTUBE] MP3 conversion failed; using source audio:', error.message);
        }

        const stat = await fs.promises.stat(source);
        if (stat.size > MAX_SIZE) {
            await fs.promises.unlink(source).catch(() => {});
            throw new Error(`Audio is too large (${Math.ceil(stat.size / 1024 / 1024)} MB).`);
        }

        return { ...media, path: source, size: stat.size, mime: source.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4', filename: `${safeName(media.title)}${source.endsWith('.mp3') ? '.mp3' : '.m4a'}` };
    }

    const output = `${base}.mp4`;
    await runYtDlp(media.url, {
        format: 'best[ext=mp4][vcodec!=none][acodec!=none]/18/best[ext=mp4]/best',
        output: raw,
        preferFreeFormats: true
    });

    let source = output;
    if (!fs.existsSync(source)) {
        const files = (await fs.promises.readdir(TEMP_DIR))
            .filter(f => f.startsWith(`yt-${id}.`))
            .map(f => path.join(TEMP_DIR, f));
        source = files.find(f => f.endsWith('.mp4')) || files[0];
    }
    if (!source || !fs.existsSync(source)) throw new Error('YouTube returned no video file.');

    const stat = await fs.promises.stat(source);
    if (stat.size > MAX_SIZE) {
        await fs.promises.unlink(source).catch(() => {});
        throw new Error(`Video is too large (${Math.ceil(stat.size / 1024 / 1024)} MB).`);
    }

    return { ...media, path: source, size: stat.size, mime: 'video/mp4', filename: `${safeName(media.title)}.mp4` };
}

async function cleanup(file) {
    if (file?.path) await fs.promises.unlink(file.path).catch(() => {});
}

module.exports = { search, download, cleanup, safeName };
