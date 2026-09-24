const axios = require("axios");
const config = require("../config");

const HOST = process.env.YT_API_HOST || "yt-api.p.rapidapi.com";
const BASE_URL = (process.env.YT_API_BASE_URL || `https://${HOST}`).replace(/\/$/, "");

function getApiKey() {
    return config.API_KEYS?.DOWNLOAD || config.API_KEYS?.RAPIDAPI || "";
}

function validate() {
    if (!getApiKey()) {
        throw new Error("YouTube API key is not configured. Add DOWNLOAD_API_KEY to your .env/Render environment.");
    }
}

function headers() {
    return {
        "x-rapidapi-host": HOST,
        "x-rapidapi-key": getApiKey(),
        "Accept": "application/json",
        "User-Agent": `${config.BOT_NAME}/${config.BOT_VERSION}`
    };
}

async function apiGet(path, params = {}) {
    validate();
    try {
        const res = await axios.get(`${BASE_URL}${path}`, {
            params,
            headers: headers(),
            timeout: 60000
        });
        return res.data;
    } catch (error) {
        const status = error.response?.status;
        const body = error.response?.data;
        const message = body?.message || body?.error || body?.detail || error.message;
        throw new Error(`YT-API${status ? ` (${status})` : ""}: ${message}`);
    }
}

function looksLikeVideoId(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

function videoIdFromUrl(value) {
    if (typeof value !== "string") return null;
    try {
        const u = new URL(value);
        if (u.hostname === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] || null;
        if (u.hostname.includes("youtube.com")) {
            if (u.searchParams.get("v")) return u.searchParams.get("v");
            const parts = u.pathname.split("/").filter(Boolean);
            const i = parts.findIndex(x => ["shorts", "embed", "v"].includes(x));
            if (i >= 0 && parts[i + 1]) return parts[i + 1];
        }
    } catch (_) {}
    return null;
}

function extractVideoCandidates(value, out = [], seen = new Set()) {
    if (value == null || out.length >= 10) return out;
    if (typeof value === "string") {
        const id = looksLikeVideoId(value) ? value : videoIdFromUrl(value);
        if (id && !seen.has(id)) { seen.add(id); out.push({ videoId: id }); }
        return out;
    }
    if (typeof value !== "object") return out;
    if (seen.has(value)) return out;
    seen.add(value);
    if (looksLikeVideoId(value.videoId)) out.push({ videoId: value.videoId, title: value.title || value.name || "" });
    else if (looksLikeVideoId(value.id) && (value.title || value.name || value.videoId)) out.push({ videoId: value.id, title: value.title || value.name || "" });
    if (value.url) {
        const id = videoIdFromUrl(value.url);
        if (id && !out.some(x => x.videoId === id)) out.push({ videoId: id, title: value.title || value.name || "" });
    }
    for (const key of Object.keys(value)) {
        if (out.length >= 10) break;
        extractVideoCandidates(value[key], out, seen);
    }
    return out;
}

async function search(query) {
    const direct = videoIdFromUrl(query);
    if (direct) return { videoId: direct, title: "" };
    const data = await apiGet("/search", { query });
    const candidates = extractVideoCandidates(data);
    if (!candidates.length) throw new Error("YT-API search returned no YouTube video result.");
    return candidates[0];
}

function formatsFrom(data) {
    const formats = data?.formats || data?.data?.formats || data?.result?.formats || [];
    return Array.isArray(formats) ? formats.filter(x => x && typeof x.url === "string") : [];
}

function pickAudio(formats) {
    const audioOnly = formats.filter(f => {
        const mime = String(f.mimeType || f.mime || f.type || "").toLowerCase();
        return mime.includes("audio") && !mime.includes("video");
    });
    const pool = audioOnly.length ? audioOnly : formats.filter(f => String(f.mimeType || f.mime || "").toLowerCase().includes("audio"));
    if (!pool.length) throw new Error("YT-API did not return an audio format.");
    return pool.sort((a,b) => Number(b.bitrate || b.audioBitrate || b.abr || 0) - Number(a.bitrate || a.audioBitrate || a.abr || 0))[0];
}

function pickVideo(formats) {
    const mp4 = formats.filter(f => {
        const mime = String(f.mimeType || f.mime || f.type || "").toLowerCase();
        return mime.includes("video") && (!mime.includes("webm") || mime.includes("mp4"));
    });
    const withAudio = mp4.filter(f => f.audioQuality || f.hasAudio === true || String(f.mimeType || "").toLowerCase().includes("audio"));
    const pool = withAudio.length ? withAudio : mp4;
    if (!pool.length) throw new Error("YT-API did not return a video format.");
    // Prefer formats that fit the bot's 50 MB WhatsApp limit, then highest resolution.
    const allowed = pool.filter(f => !f.contentLength || Number(f.contentLength) <= config.DOWNLOAD.MAX_FILE_SIZE);
    const candidates = allowed.length ? allowed : pool;
    return candidates.sort((a,b) => Number(b.height || b.qualityLabel?.replace(/\\D/g, "") || 0) - Number(a.height || a.qualityLabel?.replace(/\\D/g, "") || 0))[0];
}

async function getDownload(query, type = "audio") {
    const found = await search(query);
    const data = await apiGet("/dl", { id: found.videoId });
    const formats = formatsFrom(data);
    const format = type === "audio" ? pickAudio(formats) : pickVideo(formats);
    return {
        videoId: found.videoId,
        title: data?.title || data?.data?.title || found.title || `YouTube ${type}`,
        url: format.url,
        mimeType: String(format.mimeType || format.mime || (type === "audio" ? "audio/mpeg" : "video/mp4")).split(";")[0],
        size: Number(format.contentLength || format.filesize || 0) || 0,
        format
    };
}

async function downloadBuffer(url) {
    if (!/^https?:\/\//i.test(url)) throw new Error("YT-API returned an invalid media URL.");
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: config.DOWNLOAD.MAX_FILE_SIZE,
        maxBodyLength: config.DOWNLOAD.MAX_FILE_SIZE,
        headers: { "User-Agent": `${config.BOT_NAME}/${config.BOT_VERSION}` }
    });
    const buffer = Buffer.from(response.data);
    if (buffer.length > config.DOWNLOAD.MAX_FILE_SIZE) {
        throw new Error(`Downloaded file is too large. Maximum is ${Math.round(config.DOWNLOAD.MAX_FILE_SIZE / 1024 / 1024)} MB.`);
    }
    return { buffer, contentType: response.headers["content-type"] || "" };
}

module.exports = {
    getApiKey,
    search,
    getDownload,
    downloadBuffer,
    HOST,
    BASE_URL
};
