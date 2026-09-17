/* ==========================================
   DRIP QUEEN MD - UNIFIED SESSION MANAGER
   Creator: NOX STAR TECH

   This module is the compatibility entry point for the application's
   session manager.  The actual session state lives in newSession.js so
   pairing, restoration, reconnects, dashboard status and admin removal
   all operate on the SAME multi-user session registry.

   Do not create another activeSessions Map here.  Multiple independent
   registries can make the dashboard disagree with the WhatsApp worker.
========================================== */

"use strict";

const sessionManager = require("./newSession");

/**
 * Return the unified multi-user session statistics.
 * Kept for backwards compatibility with code that imported session.js.
 */
function getSessionStats() {
    let sessions = [];

    try {
        sessions = typeof sessionManager.getSessions === "function"
            ? sessionManager.getSessions()
            : [];
    } catch (error) {
        console.error("[SESSION STATS ERROR]", error.message);
    }

    return {
        active: sessions.filter(session => session && session.connected).length,
        total: sessions.length,
        multiUser: true,
        limit: null
    };
}

module.exports = {
    ...sessionManager,
    getSessionStats,
    getActiveSessions: sessionManager.getSessions,
    createSession: sessionManager.connectSession,
    initializeSessions: sessionManager.restoreSessions,
    loadSessions: sessionManager.restoreSessions,
    deleteSession: sessionManager.removeSession
};
