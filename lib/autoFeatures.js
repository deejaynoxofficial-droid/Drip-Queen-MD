const config = require("../config");

const {
    getSettings
} = require("./autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO FEATURES ENGINE
// Creator: NOX STAR TECH
// ==========================================


// Random reactions
const reactions = [
    "❤️",
    "🔥",
    "👍",
    "😂",
    "😍",
    "💯",
    "✨",
    "👑",
    "🤖",
    "⚡"
];


// ==========================================
// DELAY FUNCTION
// ==========================================

function delay(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}


// ==========================================
// GET RANDOM REACTION
// ==========================================

function getRandomReaction() {
    return reactions[
        Math.floor(
            Math.random() * reactions.length
        )
    ];
}


// ==========================================
// MAIN AUTO FEATURES HANDLER
// ==========================================

async function handleAutoFeatures({
    sock,
    message,
    from,
    sender,
    isGroup,
    pushName
}) {
    try {

        // Get latest settings
        const settings = getSettings();

        // Ignore invalid messages
        if (!message || !message.key) {
            return;
        }

        // Ignore bot's own messages
        if (message.key.fromMe) {
            return;
        }


        // =====================================
        // AUTO TYPING
        // =====================================

        if (settings.autoTyping) {
            try {
                await sock.sendPresenceUpdate(
                    "composing",
                    from
                );

                await delay(1000);

                await sock.sendPresenceUpdate(
                    "paused",
                    from
                );

            } catch (error) {
                console.error(
                    "[AUTO TYPING ERROR]",
                    error.message
                );
            }
        }


        // =====================================
        // AUTO RECORDING
        // =====================================

        if (settings.autoRecording) {
            try {
                await sock.sendPresenceUpdate(
                    "recording",
                    from
                );

                await delay(1000);

                await sock.sendPresenceUpdate(
                    "paused",
                    from
                );

            } catch (error) {
                console.error(
                    "[AUTO RECORDING ERROR]",
                    error.message
                );
            }
        }


        // =====================================
        // AUTO REACT
        // =====================================

        if (settings.autoReact) {
            try {

                await sock.sendMessage(
                    from,
                    {
                        react: {
                            text: getRandomReaction(),
                            key: message.key
                        }
                    }
                );

            } catch (error) {
                console.error(
                    "[AUTO REACT ERROR]",
                    error.message
                );
            }
        }


        // =====================================
        // AUTO REPLY
        // =====================================

        if (settings.autoReply) {
            try {

                const autoReplyMessage = `
╔══════════════════════════════╗
║       🤖 AUTO REPLY          ║
╚══════════════════════════════╝

Hello ${pushName || "there"}! 👋

Thank you for messaging me.

I may not be available right now,
but DRIP QUEEN MD is online.

Please wait for a response.

> ${config.BOT_NAME}
> Created by ${config.CREATOR}
`;

                await sock.sendMessage(
                    from,
                    {
                        text: autoReplyMessage
                    }
                );

            } catch (error) {
                console.error(
                    "[AUTO REPLY ERROR]",
                    error.message
                );
            }
        }

    } catch (error) {

        console.error(
            "[AUTO FEATURES ENGINE ERROR]",
            error.message
        );
    }
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    handleAutoFeatures
};
