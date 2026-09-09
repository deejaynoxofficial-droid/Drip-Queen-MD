const config = require("../../config");

// ==========================================
// DRIP QUEEN MD - COIN FLIP COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "flip",

    aliases: [
        "coin",
        "coinflip"
    ],

    category: "Fun",

    description:
        "Flip a virtual coin and get heads or tails.",

    usage: `${config.PREFIX}flip`,

    execute: async ({
        reply,
        react
    }) => {
        try {
            const results = [
                "HEADS 🪙",
                "TAILS 🪙"
            ];

            const result =
                results[
                    Math.floor(
                        Math.random() * results.length
                    )
                ];

            await react("🪙");

            await reply(`
╔══════════════════════════════╗
║        🪙 COIN FLIP          ║
╚══════════════════════════════╝

       ╭──────────────╮
          ${result}
       ╰──────────────╯

🎲 The coin has been flipped!

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[FLIP COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "🪙 Coin result: HEADS"
                );
            } catch {}
        }
    }
};