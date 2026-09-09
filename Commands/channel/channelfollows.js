const fs = require("fs");
const path = require("path");

const config = require("../../config");

// ==========================================
// STORAGE
// ==========================================

const DATA_DIR = path.join(__dirname, "..", "database");

const SUBSCRIBERS_FILE = path.join(
DATA_DIR,
"channelSubscribers.json"
);

// ==========================================
// STORAGE FUNCTIONS
// ==========================================

function ensureStorage() {
try {
if (!fs.existsSync(DATA_DIR)) {
fs.mkdirSync(DATA_DIR, {
recursive: true
});
}

    if (!fs.existsSync(SUBSCRIBERS_FILE)) {
        fs.writeFileSync(
            SUBSCRIBERS_FILE,
            JSON.stringify([], null, 2),
            "utf8"
        );
    }

    return true;

} catch (error) {
    console.error(
        "[CHANNEL STORAGE ERROR]",
        error.message
    );

    return false;
}

}

function getSubscribers() {
try {
ensureStorage();

    const data = fs.readFileSync(
        SUBSCRIBERS_FILE,
        "utf8"
    );

    const subscribers = JSON.parse(data);

    return Array.isArray(subscribers)
        ? subscribers
        : [];

} catch (error) {
    console.error(
        "[CHANNEL READ ERROR]",
        error.message
    );

    return [];
}

}

function saveSubscribers(subscribers) {
try {
ensureStorage();

    fs.writeFileSync(
        SUBSCRIBERS_FILE,
        JSON.stringify(subscribers, null, 2),
        "utf8"
    );

    return true;

} catch (error) {
    console.error(
        "[CHANNEL SAVE ERROR]",
        error.message
    );

    return false;
}

}

// ==========================================
// OWNER CHECK
// ==========================================

function normalizeNumber(value = "") {
return String(value).replace(/\D/g, "");
}

function isOwner(sender) {
try {
const senderNumber =
normalizeNumber(
String(sender).split("@")[0]
);

    if (!senderNumber) {
        return false;
    }

    return config.OWNER_NUMBERS.includes(
        senderNumber
    );

} catch {
    return false;
}

}

// ==========================================
// DELAY FUNCTION
// ==========================================

function delay(ms) {
return new Promise(resolve =>
setTimeout(resolve, ms)
);
}

// ==========================================
// COMMAND
// ==========================================

module.exports = {
name: "channel",

aliases: [
    "subscribe",
    "unsubscribe",
    "promotechannel",
    "channelpromo"
],

category: "General",

description:
    "Manage opt-in WhatsApp Channel promotions.",

usage: `${config.PREFIX}channel`,

execute: async ({
    command,
    args,
    sender,
    from,
    sock,
    reply,
    react
}) => {
    try {
        const subscribers =
            getSubscribers();

        // ======================================
        // SUBSCRIBE
        // ======================================

        if (command === "subscribe") {
            const exists = subscribers.some(
                item => item.jid === from
            );

            if (exists) {
                return await reply(`

ℹ️ This chat is already subscribed.

Use ${config.PREFIX}unsubscribe
to stop receiving promotions.
`);
}

            subscribers.push({
                jid: from,
                subscribedBy: sender,
                subscribedAt:
                    new Date().toISOString()
            });

            saveSubscribers(subscribers);

            await react("✅");

            return await reply(`

╔══════════════════════════════╗
║   📢 CHANNEL PROMOTIONS      ║
╚══════════════════════════════╝

✅ Subscription successful!

This chat has opted in to receive
future WhatsApp Channel promotions.

╭─〔 CONTROL 〕
│
│ To unsubscribe:
│ ${config.PREFIX}unsubscribe
│
╰────────────────────

«${config.BOT_NAME}
`);
}

        // ======================================
        // UNSUBSCRIBE
        // ======================================

        if (command === "unsubscribe") {
            const filtered =
                subscribers.filter(
                    item => item.jid !== from
                );

            if (
                filtered.length ===
                subscribers.length
            ) {
                return await reply(`

ℹ️ This chat is not subscribed
to channel promotions.
`);
}

            saveSubscribers(filtered);

            await react("👋");

            return await reply(`

╔══════════════════════════════╗
║      UNSUBSCRIBED 👋         ║
╚══════════════════════════════╝

You will no longer receive
channel promotion messages.

You can subscribe again anytime:

${config.PREFIX}subscribe
`);
}

        // ======================================
        // PROMOTE CHANNEL - OWNER ONLY
        // ======================================

        if (
            command === "promotechannel" ||
            command === "channelpromo"
        ) {

            // SECURITY CHECK
            if (!isOwner(sender)) {
                await react("❌");

                return await reply(`

╔══════════════════════════════╗
║      ACCESS DENIED ❌         ║
╚══════════════════════════════╝

This command is restricted
to the bot owner.

«Unauthorized access attempt blocked.
`);
}

            const channelLink =
                args.join(" ").trim();

            if (!channelLink) {
                return await reply(`

╔══════════════════════════════╗
║    📢 CHANNEL PROMOTION      ║
╚══════════════════════════════╝

Usage:

${config.PREFIX}promotechannel <channel link>

Example:

${config.PREFIX}promotechannel https://whatsapp.com/channel/XXXXXXXX

Only opted-in chats will receive
the promotion message.
`);
}

            // Validate WhatsApp Channel link
            const validLink =
                /^https?:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+\/?$/i
                    .test(channelLink);

            if (!validLink) {
                return await reply(`

❌ Invalid WhatsApp Channel link.

Example:

https://whatsapp.com/channel/XXXXXXXXXXXX
`);
}

            if (subscribers.length === 0) {
                return await reply(`

⚠️ No opted-in subscribers found.

Users can subscribe using:

${config.PREFIX}subscribe
`);
}

            await react("📢");

            // ==================================
            // PROMOTION MESSAGE
            // ==================================

            const promotionMessage = `

╔══════════════════════════════╗
║      📢 CHANNEL PROMOTION    ║
╚══════════════════════════════╝

🔥 JOIN OUR OFFICIAL WHATSAPP CHANNEL!

Stay connected for:

✨ Latest Updates
📢 Important Announcements
🔥 Exclusive Content
🎉 Entertainment
🚀 Special Releases

👇 FOLLOW THE CHANNEL BELOW 👇

🔗 ${channelLink}

╭─〔 SUPPORT THE CHANNEL 〕
│
│ ✅ Follow
│ 🔔 Enable notifications
│ 📤 Share with friends
│ ❤️ React to updates
│
╰────────────────────

To stop receiving promotions:

${config.PREFIX}unsubscribe

«Powered by ${config.BOT_NAME}
Created by ${config.CREATOR}
`;

            let success = 0;
            let failed = 0;

            // ==================================
            // SEND TO OPTED-IN CHATS ONLY
            // ==================================

            for (const subscriber of subscribers) {
                try {
                    await sock.sendMessage(
                        subscriber.jid,
                        {
                            text: promotionMessage
                        }
                    );

                    success++;

                    // Gentle pacing between sends
                    await delay(1200);

                } catch (error) {
                    failed++;

                    console.error(
                        `[PROMOTION FAILED] ${subscriber.jid}`,
                        error.message
                    );
                }
            }

            return await reply(`

╔══════════════════════════════╗
║    📢 PROMOTION COMPLETE     ║
╚══════════════════════════════╝

📨 Subscribers: ${subscribers.length}
✅ Sent Successfully: ${success}
❌ Failed: ${failed}

🔒 Owner-only command confirmed.
📢 Only opted-in chats contacted.
`);
}

        // ======================================
        // DEFAULT HELP
        // ======================================

        return await reply(`

╔══════════════════════════════╗
║    📢 CHANNEL PROMOTION      ║
╚══════════════════════════════╝

╭─〔 AVAILABLE COMMANDS 〕
│
│ ${config.PREFIX}subscribe
│ Opt in to promotions.
│
│ ${config.PREFIX}unsubscribe
│ Stop receiving promotions.
│
│ ${config.PREFIX}channel
│ Show this help menu.
│
╰────────────────────

«${config.BOT_NAME}
${config.CREATOR}
`);

    } catch (error) {
        console.error(
            "[CHANNEL COMMAND ERROR]",
            error.message
        );

        try {
            await reply(
                "❌ An unexpected error occurred."
            );
        } catch {}
    }
}

};