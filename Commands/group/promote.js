module.exports = {

    name:
        "promote",

    category:
        "Group",

    description:
        "Promote a member to group admin",


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


        let target =
            msg.message
                ?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid?.[0];


        if (
            !target &&
            args[0]
        ) {

            const number =
                args[0]
                    .replace(
                        /[^0-9]/g,
                        ""
                    );


            target =
                `${number}@s.whatsapp.net`;

        }


        if (!target) {

            return reply(
                "Usage:\n.promote @user"
            );

        }


        try {

            await sock.groupParticipantsUpdate(

                from,

                [target],

                "promote"

            );


            await reply(
                "👑 Member promoted to admin."
            );


        } catch (error) {

            await reply(
                "❌ Failed. Make sure the bot is an admin."
            );

        }

    }

};