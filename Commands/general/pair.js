const newSession =
    require("../../src/newSession");


module.exports = {

    name:
        "pair",

    aliases: [
        "paircode",
        "link"
    ],

    category:
        "General",

    description:
        "Generate a WhatsApp pairing code",


    async execute(
        context
    ) {

        const {

            args,
            reply

        } = context;


        if (
            !args[0]
        ) {

            return await reply(
                "📱 Please provide a phone number.\n\n" +
                "Example:\n" +
                ".pair 256700000000"
            );

        }


        const phoneNumber =
            args[0]
                .replace(
                    /[^0-9]/g,
                    ""
                );


        if (
            phoneNumber.length < 8
        ) {

            return await reply(
                "❌ Invalid phone number.\n\n" +
                "Use the country code.\n" +
                "Example: 256700000000"
            );

        }


        await reply(
            "⏳ Generating pairing code...\nPlease wait."
        );


        try {

            const result =
                await newSession.generatePairingCode(
                    phoneNumber
                );


            const code =
                result.pairingCode ||
                result.code;


            if (!code) {

                throw new Error(
                    "Pairing code was not generated"
                );

            }


            await reply(
                "╭━━━〔 🔗 PAIRING CODE 〕━━━╮\n\n" +
                `📱 Number: ${phoneNumber}\n` +
                `🔑 Code: *${code}*\n\n` +
                "📲 WhatsApp → Linked Devices → Link a Device\n" +
                "Choose: Link with phone number\n\n" +
                "╰━━━━━━━━━━━━━━━━━━╯"
            );


        } catch (error) {

            console.error(
                "[PAIR COMMAND ERROR]",
                error.message
            );


            await reply(
                "❌ Failed to generate pairing code.\n\n" +
                error.message
            );

        }

    }

};