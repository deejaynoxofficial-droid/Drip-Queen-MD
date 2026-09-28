const config = require('../config');

// ════════════════════════════════════════════════════════════
// 📁 SHARED NOXSTAR FREE BOT STYLE HELPER
// Unified visual identity used across every plugin/reply in the bot.
// Base frame:
//   ╭┄┄『`TITLE`』
//   │
//   │✦ line 1
//   │✦ line 2
//   │
//   ╰┄┄┄┄┄┄┄┄┄┄┄┄⪼
// ════════════════════════════════════════════════════════════

/**
 * Build the base framed block.
 * @param {string} title - shown inside 『` `』
 * @param {string[]|string} lines - body line(s), each prefixed with "✦ "
 */
function frame(title, lines) {
    const list = Array.isArray(lines) ? lines : [lines];
    const body = list
        .filter(l => l !== undefined && l !== null && l !== '')
        .map(l => `*│✦ ${l}*`)
        .join('\n');
    return `*╭┄┄『 \`${title}\` 』*\n*│*\n${body}\n*│*\n*╰┄┄┄┄┄┄┄┄┄┄┄┄⪼*`;
}

/**
 * Legacy-compatible helper kept for existing call sites:
 * siddTechx(title, value, status) -> framed block with title/value/status.
 * Still used across many plugins, now rendered with the new global style.
 */
function siddTechx(title, value, status) {
    const lines = [];
    if (value !== undefined && value !== null && value !== '') lines.push(`${title}: ${value}`);
    if (status !== undefined && status !== null && status !== '') lines.push(`sᴛᴀᴛᴜs: ${status}`);
    return `\n${frame(config.BOT_NAME || 'NOX STAR BOT', lines)}\n\n> ${config.BOT_FOOTER || '© 𝗠𝗔𝗗𝗘 𝗕𝗬 𝗦𝗜𝗗𝗗 𝗧𝗘𝗖𝗛𝗫'}\n`;
}

/** Generic titled block: style.box('COMMAND', ['NAME: ABOUT', 'DESCRIPTION: BOT INFO']) */
function box(title, lines) {
    return frame(title, lines);
}

/** ✅ Success block */
function success(text) {
    return frame('SUCCESS', text);
}

/** ❌ Error block */
function error(text) {
    return frame('ERROR', text || 'AN ERROR OCCURRED');
}

/** ⚠️ Warning block */
function warning(text) {
    return frame('WARNING', text);
}

/** ℹ️ Info block */
function info(text) {
    return frame('INFO', text);
}

/** 📜 Menu-style block: style.menu('MENU', ['COMMANDS', 'GROUP', 'OWNER']) */
function menu(title, lines) {
    return frame(title, lines);
}

module.exports = { noxstarTechx, frame, box, success, error, warning, info, menu };
