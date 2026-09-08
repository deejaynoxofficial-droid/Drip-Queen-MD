module.exports = {

    name:
        "tagall",

    aliases: [
        "everyone"
    ],

    category:
        "Group",

    description:
        "Mention all group members",


    async execute(context) {

        const {
            sock,
            msg,
            args,
            reply,
            isGroup,
            from
        } = context;


        if (!isGroup) {

            return reply(
                "❌ Group command only."
            );

        }


        try {

            const metadata =
                await sock.groupMetadata(
                    from
                );


            const participants =
                metadata.participants
                    .map(
                        participant =>
                            participant.id
                    );


            const customMessage =
                args.join(" ") ||
                "Attention everyone!";


            let text =
                `📢 *TAG ALL*\n\n${customMessage}\n\n`;


            for (
                const participant
                of participants
            ) {

                const number =
                    participant
                        .split("@")[0];


                text +=
                    `@${number}\n`;

            }


            await sock.sendMessage(

                from,

                {
                    text,
                    mentions:
                        participants
                }

            );


        } catch (error) {

            console.error(
                "[TAGALL ERROR]",
                error.message
            );


            await reply(
                "❌ Failed to tag members."
            );

        }

    }

};