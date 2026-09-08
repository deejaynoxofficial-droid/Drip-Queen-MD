const config = require("../../config");


/* ==========================================
   YTMP4 COMMAND
========================================== */

module.exports = {

    name:
        "ytmp4",


    aliases: [

        "ytvideo",
        "youtubevideo",
        "youtubevid"

    ],


    category:
        "Download",


    description:
        "Search and download YouTube video using a query",


    usage:
        ".ytmp4 <video name>",


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

`╭─〔 🎬 YOUTUBE MP4 〕
│
│ Please enter a video name.
│
│ Example:
│ ${prefix}ytmp4 Burna Boy City Boys
│
│ You can search by:
│ • Video title
│ • Artist name
│ • Movie trailer
│ • Music video
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
               SEARCHING MESSAGE
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎬 YOUTUBE MP4 〕
│
│ 🔎 Searching YouTube...
│
│ 🎥 ${query}
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

               DOWNLOAD FLOW

               User Query
                    ↓
               YouTube Search
                    ↓
               Find Best Result
                    ↓
               Get MP4 Download
                    ↓
               Download Video
                    ↓
               Send to WhatsApp

               ==========================================

               API integration will be connected
               later when the download provider
               is configured.
            */


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎬 MP4 RESULT 〕
│
│ 🔎 Search:
│ ${query}
│
│ ⚙️ Video engine initialized.
│
│ ⏳ Preparing MP4 download...
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

                "[YTMP4 COMMAND ERROR]",

                error.message

            );


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ MP4 ERROR 〕
│
│ Failed to process your request.
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