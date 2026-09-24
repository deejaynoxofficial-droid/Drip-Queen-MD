const config = require("../config");

function normalizeJid(jid = "") {
    return String(jid).split(":")[0];
}

function isSameJid(a, b) {
    if (!a || !b) return false;
    const x = normalizeJid(a);
    const y = normalizeJid(b);
    return x === y || x.split("@")[0] === y.split("@")[0];
}

async function getGroupInfo(sock, from) {
    return sock.groupMetadata(from);
}

function getBotJid(sock) {
    return sock?.user?.id || sock?.user?.lid || "";
}

function isAdmin(participant) {
    return Boolean(participant?.admin === "admin" || participant?.admin === "superadmin" || participant?.admin);
}

function findParticipant(metadata, jid) {
    return (metadata?.participants || []).find(p => isSameJid(p.id, jid));
}

function isBotAdmin(metadata, sock) {
    return isAdmin(findParticipant(metadata, getBotJid(sock)));
}

function isSenderAdmin(metadata, sender) {
    return isAdmin(findParticipant(metadata, sender));
}

function requireGroup(isGroup, reply) {
    if (!isGroup) {
        reply("❌ This command can only be used in a group.");
        return false;
    }
    return true;
}

function requireAdmin(metadata, sender, reply, isOwner = false) {
    if (isOwner || isSenderAdmin(metadata, sender)) return true;
    reply("❌ Group admin permission required.");
    return false;
}

function requireBotAdmin(metadata, sock, reply) {
    if (isBotAdmin(metadata, sock)) return true;
    reply("❌ I need to be a group admin to do that.");
    return false;
}

module.exports = {
    config,
    normalizeJid,
    isSameJid,
    getGroupInfo,
    getBotJid,
    isAdmin,
    findParticipant,
    isBotAdmin,
    isSenderAdmin,
    requireGroup,
    requireAdmin,
    requireBotAdmin
};
