const config = require("../../config");


/* ==========================================
   VIDEO COMMAND
========================================== */

module.exports = {

    name:
        "video",


    aliases: [

        "vid",
        "mp4",
        "video"

    ],


    category:
        "Download",


    description:
        "Search and download a video using a query",


    usage:
        ".video <video name>",


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

`╭─〔 🎬 VIDEO DOWNLOADER 〕
│
│ Please enter a video name.
│
│ Example:
│ ${prefix}video Burna Boy City Boys
│
│ More examples:
│ ${prefix}video Wizkid Essence
│ ${prefix}video Funny Cat Videos
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

`╭─〔 🎬 VIDEO SEARCH 〕
│
│ 🔎 Searching:
│ ${query}
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

               VIDEO DOWNLOAD FLOW

               Query
                 ↓
               Search API
                 ↓
               Find matching video
                 ↓
               Request MP4 download
                 ↓
               Download video
                 ↓
               Send to WhatsApp

               ==========================================

               API integration will be added later.
            */


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎬 VIDEO RESULT 〕
│
│ 🔎 Query:
│ ${query}
│
│ ⚙️ Video engine initialized.
│
│ ⏳ Preparing video service...
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

                "[VIDEO COMMAND ERROR]",

                error.message

            );


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ VIDEO ERROR 〕
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