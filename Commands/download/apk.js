const axios = require("axios");

const config = require("../../config");


/* ==========================================
   APK COMMAND
========================================== */

module.exports = {

    name:
        "apk",


    aliases: [

        "apkdownload",
        "app",
        "appdownload"

    ],


    category:
        "Download",


    description:
        "Search and download APK using an app name",


    usage:
        ".apk <app name>",


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
           GET APP QUERY
        ========================================== */

        const query =
            args.join(" ").trim();


        if (!query) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📱 APK DOWNLOADER 〕
│
│ Please provide an app name.
│
│ Example:
│ ${prefix}apk WhatsApp
│
│ ${prefix}apk CapCut
│
│ ${prefix}apk TikTok
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
           REACTION
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
           SEARCH MESSAGE
        ========================================== */

        await sock.sendMessage(

            chatId,

            {

                text:

`╭─〔 🔍 APK SEARCH 〕
│
│ Searching for:
│ *${query}*
│
│ Please wait...
│
╰───────────────`

            },

            {

                quoted:
                    msg

            }

        );


        try {

            /* ==========================================
               API KEY CHECK
            ========================================== */

            const apiKey =

                config.API_KEYS?.DOWNLOAD ||

                config.API_KEYS?.GENERAL ||

                config.API_KEYS?.RAPIDAPI ||

                "";


            if (!apiKey) {

                throw new Error(

                    "APK API key is not configured"

                );

            }


            /* ==========================================
               APK API REQUEST

               Replace this endpoint with the APK API
               provider you decide to use.
            ========================================== */

            const response =
                await axios.get(

                    "https://api.example.com/apk/search",

                    {

                        params: {

                            q:
                                query,

                            apikey:
                                apiKey

                        },


                        timeout:
                            60000

                    }

                );


            const data =
                response.data;


            /* ==========================================
               VALIDATE RESULT
            ========================================== */

            if (

                !data ||

                data.status === false

            ) {

                throw new Error(

                    "APK not found"

                );

            }


            const result =

                data.result ||

                data.data ||

                data;


            const appName =

                result.name ||

                result.title ||

                query;


            const version =

                result.version ||

                "Unknown";


            const developer =

                result.developer ||

                result.publisher ||

                "Unknown";


            const size =

                result.size ||

                "Unknown";


            const downloadUrl =

                result.download ||

                result.url ||

                result.link;


            const thumbnail =

                result.thumbnail ||

                result.image ||

                result.icon;


            if (!downloadUrl) {

                throw new Error(

                    "APK download link was not returned"

                );

            }


            /* ==========================================
               RESULT CAPTION
            ========================================== */

            const caption =

`╭─〔 📱 APK FOUND 〕
│
│ 📦 Name: ${appName}
│ 🔖 Version: ${version}
│ 👨‍💻 Developer: ${developer}
│ 📊 Size: ${size}
│
│ ⏳ Preparing APK...
│
╰───────────────`;


            /* ==========================================
               SEND APP IMAGE
            ========================================== */

            if (thumbnail) {

                try {

                    await sock.sendMessage(

                        chatId,

                        {

                            image: {

                                url:
                                    thumbnail

                            },


                            caption

                        },

                        {

                            quoted:
                                msg

                        }

                    );

                } catch (error) {

                    await sock.sendMessage(

                        chatId,

                        {

                            text:
                                caption

                        },

                        {

                            quoted:
                                msg

                        }

                    );

                }

            } else {

                await sock.sendMessage(

                    chatId,

                    {

                        text:
                            caption

                    },

                    {

                        quoted:
                            msg

                    }

                );

            }


            /* ==========================================
               DOWNLOAD APK
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    document: {

                        url:
                            downloadUrl

                    },


                    fileName:

                        `${appName}.apk`,


                    mimetype:

                        "application/vnd.android.package-archive"

                },

                {

                    quoted:
                        msg

                }

            );


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

                "[APK COMMAND ERROR]",

                error.message

            );


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

            } catch (reactionError) {}


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ APK ERROR 〕
│
│ ${error.message}
│
│ Try another app name.
│
│ Example:
│ ${prefix}apk WhatsApp
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
