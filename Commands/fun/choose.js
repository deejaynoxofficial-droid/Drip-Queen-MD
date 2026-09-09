const config = require("../../config");

// ==========================================
// DRIP QUEEN MD - CHOOSE COMMAND
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "choose",

    aliases: [
        "pick",
        "select"
    ],

    category: "Fun",

    description:
        "Randomly choose one option from multiple choices.",

    usage: `${config.PREFIX}choose option1 | option2 | option3`,

    execute: async ({
        text,
        reply,
        react
    }) => {
        try {
            // Check if options were provided
            if (!text || !text.trim()) {
                return await reply(`
╔══════════════════════════════╗
║        🎯 CHOOSE FOR ME      ║
╚══════════════════════════════╝

Please provide some options.

Example:

${config.PREFIX}choose Pizza | Burger | Chicken

Separate each option using:

|
                `);
            }

            // Split options using |
            const options = text
                .split("|")
                .map(option => option.trim())
                .filter(option => option.length > 0);

            // Require at least two options
            if (options.length < 2) {
                return await reply(`
❌ Please provide at least 2 options.

Example:

${config.PREFIX}choose Red | Blue
                `);
            }

            // Prevent excessively large input
            if (options.length > 20) {
                return await reply(
                    "❌ Maximum allowed options: 20"
                );
            }

            const selectedIndex =
                Math.floor(
                    Math.random() * options.length
                );

            const selected =
                options[selectedIndex];

            await react("🎯");

            const optionList =
                options
                    .map((option, index) =>
                        `${index + 1}. ${option}`
                    )
                    .join("\n");

            await reply(`
╔══════════════════════════════╗
║        🎯 RANDOM CHOICE      ║
╚══════════════════════════════╝

╭─〔 OPTIONS 〕
│
${optionList}
│
╰────────────────────

╭─〔 DRIP QUEEN CHOOSES 〕
│
│ 👑 ${selected}
│
╰────────────────────

🎯 Decision made!

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[CHOOSE COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to choose an option. Please try again."
                );
            } catch {}
        }
    }
};