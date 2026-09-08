module.exports = {

    name:
        "hidetag",

    aliases: [
        "htag"
    ],

    category:
        "Group",

    description:
        "Mention everyone without displaying tags",


    async execute(context) {

        const {
            sock,
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


        const message =
            args.join(" ");


        if (!message) {

            return reply(
                "Usage:\n.hidetag Your message"
            );

        }


        try {

            const metadata =
                await sock.groupMetadata(
                    from
                );


            const mentions =
                metadata.participants.map(
                    participant =>
                        participant.id
                );


            await sock.sendMessage(

                from,

                {
                    text:
                        message,

                    mentions
                }

            );


        } catch (error) {

            await reply(
                "❌ Failed to send hidden tag."
            );

        }

    }

};