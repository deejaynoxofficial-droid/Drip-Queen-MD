const config = require("../config");

// ==========================================
// DRIP QUEEN MD - MAGIC 8 BALL COMMAND
// Creator: NOX STAR TECH
// ==========================================

const answers = [
    "Yes, definitely! ✅",
    "Without a doubt. 🔥",
    "You can count on it. 💯",
    "Most likely. 👍",
    "Yes. 👑",
    "Signs point to yes. 🟢",
    "Ask again later. 🤔",
    "Better not tell you now. 👀",
    "Cannot predict right now. 🌫️",
    "Focus and ask again. 🔮",
    "Don't count on it. ❌",
    "My answer is no. 🚫",
    "Very doubtful. 😅",
    "The chances are low. 📉",
    "Not looking good. 😬"
];

module.exports = {
    name: "8ball",

    aliases: [
        "magic8",
        "ask",
        "question"
    ],

    category: "Fun",

    description:
        "Ask the Magic 8-Ball a question.",

    usage: `${config.PREFIX}8ball <question>`,

    execute: async ({
        text,
        reply,
        react
    }) => {
        try {
            // Check if the user asked a question
            if (!text || !text.trim()) {
                return await reply(`
╔══════════════════════════════╗
║       🔮 MAGIC 8-BALL        ║
╚══════════════════════════════╝

Ask me a question!

Example:

${config.PREFIX}8ball Will I be successful?

> Ask wisely... 👀
                `);
            }

            const answer =
                answers[
                    Math.floor(
                        Math.random() * answers.length
                    )
                ];

            await react("🔮");

            await reply(`
╔══════════════════════════════╗
║       🔮 MAGIC 8-BALL        ║
╚══════════════════════════════╝

╭─〔 YOUR QUESTION 〕
│
│ ${text.trim()}
│
╰────────────────────

╭─〔 THE ANSWER 〕
│
│ 🔮 ${answer}
│
╰────────────────────

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[8BALL COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "🔮 The Magic 8-Ball is unavailable right now. Try again."
                );
            } catch {}
        }
    }
};