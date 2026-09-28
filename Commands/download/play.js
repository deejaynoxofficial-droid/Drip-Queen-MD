const config = require("../../config");


/* ==========================================
   PLAY COMMAND
========================================== */

module.exports = {

    name:
        "play",


    aliases: [

        "p",
        "musicplay"

    ],


    category:
        "Download",


    description:
        "Search and play music using a query",


    usage:
        ".play <song name>",


    async execute(context) {

        const {

            sock,
            msg,
            args,
            prefix

        } = context;


        const chatId =
            msg.key.remoteJid;


        /* ==========================================
           GET SEARCH QUERY
        ========================================== */

        const query =
            args.join(" ").trim();


        /* ==========================================
           VALIDATE QUERY
        ========================================== */

        if (!query) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎧 PLAY MUSIC 〕
│
│ Please enter a song name.
│
│ Example:
│ ${prefix}play Burna Boy City Boys
│
│ More examples:
│ ${prefix}play Wizkid Essence
│ ${prefix}play Drake God's Plan
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );

        }


        try {

            /* ==========================================
               SEARCHING UI
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎧 MUSIC PLAYER 〕
│
│ 🔎 Searching music...
│
│ 🎵 ${query}
│
│ ⏳ Please wait...
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );


            /*
               ==========================================

               FUTURE DOWNLOAD FLOW

               Query
                 ↓
               Search music API
                 ↓
               Select first result
                 ↓
               Get audio download URL
                 ↓
               Send audio to WhatsApp

               ==========================================

               The actual API integration will be
               connected after we configure the
               download provider.
            */


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎵 PLAY RESULT 〕
│
│ 🔎 Query:
│ ${query}
│
│ ⚙️ Music engine initialized.
│
│ ⏳ Preparing audio service...
│
╰───────────────

🤖 ${config.BOT_NAME}`

                },

                {

                    quoted:
                        msg

                }

            );


        } catch (error) {

            console.error(

                "[PLAY COMMAND ERROR]",

                error.message

            );


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ PLAY ERROR 〕
│
│ Unable to process your request.
│
│ ${error.message}
│
│ Please try again later.
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );

        }

    }

};