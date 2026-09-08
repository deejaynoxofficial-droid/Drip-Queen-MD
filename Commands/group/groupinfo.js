module.exports = {

    name:
        "groupinfo",

    aliases: [
        "ginfo"
    ],

    category:
        "Group",

    description:
        "Display group information",


    async execute(context) {

        const {
            sock,
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


            const admins =
                metadata.participants.filter(
                    participant =>
                        participant.admin
                );


            const text =
                `
╭━━━〔 👥 GROUP INFO 〕━━━╮

📛 Name:
${metadata.subject}

👤 Members:
${metadata.participants.length}

👑 Admins:
${admins.length}

🆔 Group ID:
${from}

╰━━━━━━━━━━━━━━━━━━╯
                `.trim();


            await reply(text);


        } catch (error) {

            await reply(
                "❌ Failed to get group information."
            );

        }

    }

};