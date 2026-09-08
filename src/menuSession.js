const menuSessions = new Map();

// ==========================================
// MENU SESSION SETTINGS
// ==========================================

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ==========================================
// CREATE MENU SESSION
// ==========================================

function createMenuSession(userId, data = {}) {
if (!userId) return false;

menuSessions.set(String(userId), {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TIMEOUT
});

return true;

}

// ==========================================
// GET MENU SESSION
// ==========================================

function getMenuSession(userId) {
if (!userId) return null;

const session = menuSessions.get(String(userId));

if (!session) {
    return null;
}

// Check expiration
if (Date.now() > session.expiresAt) {
    menuSessions.delete(String(userId));
    return null;
}

return session;

}

// ==========================================
// UPDATE MENU SESSION
// ==========================================

function updateMenuSession(userId, updates = {}) {
const session = getMenuSession(userId);

if (!session) {
    return null;
}

const updatedSession = {
    ...session,
    ...updates,
    expiresAt: Date.now() + SESSION_TIMEOUT
};

menuSessions.set(
    String(userId),
    updatedSession
);

return updatedSession;

}

// ==========================================
// REMOVE MENU SESSION
// ==========================================

function removeMenuSession(userId) {
return menuSessions.delete(String(userId));
}

// ==========================================
// CLEAN EXPIRED SESSIONS
// ==========================================

function cleanExpiredSessions() {
const now = Date.now();

for (const [userId, session] of menuSessions.entries()) {
    if (now > session.expiresAt) {
        menuSessions.delete(userId);
    }
}

}

// Automatically clean every minute
setInterval(cleanExpiredSessions, 60 * 1000);

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
createMenuSession,
getMenuSession,
updateMenuSession,
removeMenuSession
};