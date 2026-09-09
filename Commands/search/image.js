const axios = require("axios");

const config = require("../../config");


/* ==========================================
   IMAGE SEARCH COMMAND
========================================== */

module.exports = {

    name:
        "image",


    aliases: [

        "img",
        "images",
        "pic",
        "pics"

    ],


    category:
        "Search",


    description:
        "Search for images using a query",


    usage:
        ".image <query>",


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
           GET QUERY
        ========================================== */

        const query =
            args.join(" ").trim();


        if (!query) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🖼️ IMAGE SEARCH 〕
│
│ Please provide an image
│ search query.
│
│ Usage:
│ ${prefix}image <query>
│
│ Example:
│ ${prefix}image beautiful sunset
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
               CHECK GOOGLE API
            ========================================== */

            const apiKey =
                config.API_KEYS?.GOOGLE ||
                "";


            const searchEngineId =
                process.env.GOOGLE_SEARCH_ENGINE_ID ||
                "";


            if (!apiKey) {

                throw new Error(
                    "GOOGLE_API_KEY is not configured in .env"
                );

            }


            if (!searchEngineId) {

                throw new Error(
                    "GOOGLE_SEARCH_ENGINE_ID is not configured in .env"
                );

            }


            /* ==========================================
               PROCESSING REACTION
            ========================================== */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "🔎",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            /* ==========================================
               GOOGLE IMAGE SEARCH
            ========================================== */

            const response =
                await axios.get(

                    "https://www.googleapis.com/customsearch/v1",

                    {

                        params: {

                            key:
                                apiKey,


                            cx:
                                searchEngineId,


                            q:
                                query,


                            searchType:
                                "image",


                            num:
                                5,


                            safe:

                                config.SEARCH?.SAFE_SEARCH

                                    ? "active"

                                    : "off"

                        },


                        timeout:
                            30000

                    }

                );


            const results =
                response.data?.items ||
                [];


            /* ==========================================
               NO RESULTS
            ========================================== */

            if (

                !Array.isArray(results) ||

                results.length === 0

            ) {

                return await sock.sendMessage(

                    chatId,

                    {

                        text:

`╭─〔 🖼️ IMAGE SEARCH 〕
│
│ 🔎 Query:
│ ${query}
│
│ No images found.
│
│ Try another search.
│
╰───────────────`

                    },

                    {

                        quoted:
                            msg

                    }

                );

            }


            /* ==========================================
               SEND SEARCH RESULTS
            ========================================== */

            let successCount = 0;


            for (

                let index = 0;

                index < results.length;

                index++

            ) {

                const item =
                    results[index];


                const imageUrl =
                    item.link;


                const title =
                    item.title ||
                    "Image Result";


                if (!imageUrl) {

                    continue;

                }


                try {

                    await sock.sendMessage(

                        chatId,

                        {

                            image: {

                                url:
                                    imageUrl

                            },


                            caption:

`╭─〔 🖼️ IMAGE ${index + 1} 〕
│
│ 🔎 ${query}
│
│ ${title}
│
│ Powered by:
│ ${config.BOT_NAME}
│
╰───────────────`

                        },

                        {

                            quoted:
                                msg

                        }

                    );


                    successCount++;


                } catch (error) {

                    console.log(

                        `[IMAGE SEND ERROR] ${imageUrl}`,

                        error.message

                    );

                }

            }


            /* ==========================================
               CHECK SUCCESS
            ========================================== */

            if (

                successCount === 0

            ) {

                throw new Error(
                    "Unable to send image results"
                );

            }


            /* ==========================================
               SUCCESS REACTION
            ========================================== */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "✅",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


        } catch (error) {

            console.error(

                "[IMAGE SEARCH ERROR]",

                error.response
                    ?.data ||
                error.message

            );


            const errorMessage =

                error.response
                    ?.data
                    ?.error
                    ?.message ||

                error.message ||

                "Image search failed";


            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "❌",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ IMAGE SEARCH FAILED 〕
│
│ ${errorMessage}
│
│ Please check your API settings
│ and try again.
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