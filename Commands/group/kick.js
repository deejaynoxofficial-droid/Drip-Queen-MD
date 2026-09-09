module.exports = {

    name:
        "kick",

    aliases: [
        "remove"
    ],

    category:
        "Group",

    description:
        "Remove a member from the group",


    async execute(
        context
    ) {

        const {

            sock,
            msg,
            args,
            reply,
            isGroup,
            from

        } = context;


        if (!isGroup) {

            return await reply(
                "❌ Group command only."
            );

        }


        let target;


        /*
           Mentioned user.
        */

        const mentioned =
            msg.message
                ?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid;


        if (
            mentioned &&
            mentioned.length
        ) {

            target =
                mentioned[0];

        }


        /*
           Number argument.
        */

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

            return await reply(
                "Usage:\n.kick @user\nor\n.kick 256700000000"
            );

        }


        try {

            await sock.groupParticipantsUpdate(

                from,

                [target],

                "remove"

            );


            await reply(
                "✅ Member removed successfully."
            );


        } catch (error) {

            await reply(
                "❌ Failed to remove member.\nMake sure the bot is an admin."
            );

        }

    }

};