"use strict";

const fs = require("fs");
const crypto = require("crypto");
const config = require("../config");

const TOKEN_TTL = 12 * 60 * 60 * 1000;
const DASHBOARD_CODE_LENGTH = 6;

function normalizeUserId(value) {
    return String(value || "").replace(/\D/g, "");
}

function readUsers() {
    try {
        if (!fs.existsSync(config.USERS_DB)) return { users: {} };
        const parsed = JSON.parse(fs.readFileSync(config.USERS_DB, "utf8") || "{}");
        if (parsed && parsed.users && typeof parsed.users === "object") return parsed;
        return { users: parsed && typeof parsed === "object" ? parsed : {} };
    } catch (error) {
        console.error("[DASHBOARD AUTH READ ERROR]", error.message);
        return { users: {} };
    }
}

function writeUsers(data) {
    fs.mkdirSync(config.DATABASE_PATH, { recursive: true });
    fs.writeFileSync(config.USERS_DB, JSON.stringify(data, null, 2), "utf8");
}

function encryptionKey() {
    return crypto.createHash("sha256")
        .update(`${config.ADMIN_PASSWORD}:drip-queen-user-dashboard-v1`)
        .digest();
}

function encryptPassword(password) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
    return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptPassword(value) {
    try {
        const [ivRaw, tagRaw, dataRaw] = String(value || "").split(".");
        if (!ivRaw || !tagRaw || !dataRaw) return null;
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
        decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
        return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

function generatePassword() {
    // Individual connected-user dashboard credential: exactly six digits.
    // crypto.randomInt keeps the code uniformly distributed from 000000-999999.
    return String(crypto.randomInt(0, 1000000)).padStart(DASHBOARD_CODE_LENGTH, "0");
}

function isValidDashboardPassword(value) {
    return /^\d{6}$/.test(String(value || ""));
}

function ensureUserDashboardPassword(userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) throw new Error("Invalid connected user number.");

    const data = readUsers();
    data.users = data.users || {};
    const current = data.users[normalized] || {};

    if (!current.dashboardPassword) {
        const password = generatePassword();
        data.users[normalized] = {
            ...current,
            dashboardPassword: encryptPassword(password),
            createdAt: current.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        writeUsers(data);
        return password;
    }

    const password = decryptPassword(current.dashboardPassword);
    if (isValidDashboardPassword(password)) return password;

    // Rotate legacy/non-six-digit credentials to the new six-digit format.
    const replacement = generatePassword();
    data.users[normalized] = {
        ...current,
        dashboardPassword: encryptPassword(replacement),
        updatedAt: new Date().toISOString()
    };
    writeUsers(data);
    return replacement;
}

function getUserDashboardPassword(userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return null;
    const data = readUsers();
    return decryptPassword(data.users?.[normalized]?.dashboardPassword);
}

function hasSavedSession(userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return false;
    const credsPath = require("path").join(config.SESSIONS_PATH, normalized, "creds.json");
    return fs.existsSync(credsPath);
}

function constantTimeEqual(a, b) {
    const aa = Buffer.from(String(a || ""));
    const bb = Buffer.from(String(b || ""));
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function verifyUserPassword(userId, password) {
    const stored = getUserDashboardPassword(userId);
    return Boolean(stored && constantTimeEqual(stored, password));
}

function tokenSecret() {
    return crypto.createHash("sha256")
        .update(`${config.ADMIN_PASSWORD}:drip-queen-user-token-v1`)
        .digest();
}

function createUserToken(userId) {
    const normalized = normalizeUserId(userId);
    const payload = Buffer.from(JSON.stringify({
        role: "connected-user",
        userId: normalized,
        exp: Date.now() + TOKEN_TTL
    })).toString("base64url");

    const signature = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

function verifyUserToken(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    try {
        const [payload, signature] = parts;
        const expected = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
        if (!constantTimeEqual(signature, expected)) return null;
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (data.role !== "connected-user" || !normalizeUserId(data.userId) || Number(data.exp) <= Date.now()) return null;
        return { ...data, userId: normalizeUserId(data.userId) };
    } catch {
        return null;
    }
}

function getUserToken(req) {
    const auth = String(req.headers.authorization || "");
    if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
    return String(req.headers["x-user-token"] || "").trim();
}

function requireConnectedUser(req, res, next) {
    const user = verifyUserToken(getUserToken(req));
    if (!user || !hasSavedSession(user.userId)) {
        return res.status(401).json({ success: false, error: "Connected-user authentication required" });
    }
    req.connectedUser = user;
    next();
}

function loginUser(userId, password) {
    const normalized = normalizeUserId(userId);
    if (!normalized || !hasSavedSession(normalized)) {
        return { success: false, error: "No WhatsApp session exists for this number." };
    }

    const knownPassword = getUserDashboardPassword(normalized);
    if (!knownPassword) {
        return { success: false, error: "Dashboard password has not been generated yet. Run .settings from the connected WhatsApp account." };
    }

    if (!verifyUserPassword(normalized, password)) {
        return { success: false, error: "Invalid dashboard credentials." };
    }

    return { success: true, token: createUserToken(normalized), userId: normalized, expiresIn: TOKEN_TTL };
}

module.exports = {
    normalizeUserId,
    ensureUserDashboardPassword,
    getUserDashboardPassword,
    hasSavedSession,
    createUserToken,
    verifyUserToken,
    getUserToken,
    requireConnectedUser,
    loginUser,
    TOKEN_TTL,
    DASHBOARD_CODE_LENGTH,
    isValidDashboardPassword
};
