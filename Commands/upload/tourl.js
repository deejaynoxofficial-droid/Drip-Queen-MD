const axios = require("axios");

const config = require("../../config");


/* ==========================================
   TO URL COMMAND
========================================== */

module.exports = {

    name:
        "tourl",


    aliases: [

        "url",
        "uploadurl"

    ],


    category:
        "Upload",


    description:
        "Upload replied media and get a URL",


    usage:
        ".tourl (reply to media)",


    async execute(context) {

        const {

            sock,
            msg,
            prefix

        } = context;


        const chatId =
            msg.key.remoteJid;


        /* ==========================================
           GET QUOTED MESSAGE
        ========================================== */

        const quotedMessage =
            msg.message
                ?.extendedTextMessage
                ?.contextInfo
                ?.quotedMessage;


        if (!quotedMessage) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📤 MEDIA TO URL 〕
│
│ Reply to an image, video,
│ audio or document.
│
│ Then send:
│ ${prefix}tourl
│
│ Example:
│
│ [Reply to media]
│ ${prefix}tourl
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
           CHECK UPLOAD API KEY
        ========================================== */

        const apiKey =
            config.API_KEYS?.UPLOAD ||
            config.API_KEYS?.GENERAL ||
            "";


        if (!apiKey) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ UPLOAD ERROR 〕
│
│ UPLOAD_API_KEY is not configured.
│
│ Add your API key inside:
│ .env
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
           GET UPLOAD API ENDPOINT
        ========================================== */

        const uploadUrl =
            config.API_URLS?.UPLOAD ||
            "";


        if (!uploadUrl) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ UPLOAD ERROR 〕
│
│ Upload service is not configured.
│
│ Add your upload API endpoint
│ to the configuration.
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
               PROCESSING REACTION
            ========================================== */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "📤",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            /* ==========================================
               GET QUOTED MESSAGE INFO
            ========================================== */

            const quotedKey = {

                remoteJid:
                    chatId,


                fromMe:
                    false,


                id:

                    msg.message
                        ?.extendedTextMessage
                        ?.contextInfo
                        ?.stanzaId,


                participant:

                    msg.message
                        ?.extendedTextMessage
                        ?.contextInfo
                        ?.participant

            };


            /*
               This asks Baileys to download
               the quoted media.
            */

            const stream =
                await sock.downloadMediaMessage(

                    {

                        key:
                            quotedKey,

                        message:
                            quotedMessage

                    },

                    "buffer",

                    {}

                );


            if (!stream) {

                throw new Error(

                    "Failed to download media"

                );

            }


            const buffer =
                Buffer.isBuffer(stream)

                    ?

                    stream

                    :

                    Buffer.from(stream);


            /* ==========================================
               CHECK FILE SIZE
            ========================================== */

            const maxSize =
                config.UPLOAD?.MAX_FILE_SIZE ||
                100 * 1024 * 1024;


            if (

                buffer.length >
                maxSize

            ) {

                throw new Error(

                    `File is too large. Maximum size is ${Math.floor(
                        maxSize / 1024 / 1024
                    )}MB`

                );

            }


            /* ==========================================
               CONVERT FILE TO BASE64
            ========================================== */

            const base64 =
                buffer.toString(
                    "base64"
                );


            /* ==========================================
               SEND TO UPLOAD API
            ========================================== */

            const response =
                await axios.post(

                    uploadUrl,

                    {

                        file:
                            base64

                    },

                    {

                        headers: {

                            Authorization:
                                `Bearer ${apiKey}`,


                            "x-api-key":
                                apiKey,


                            "Content-Type":
                                "application/json"

                        },


                        timeout:
                            120000

                    }

                );


            /* ==========================================
               EXTRACT UPLOAD URL
            ========================================== */

            const uploadedUrl =

                response.data?.url ||

                response.data?.data?.url ||

                response.data?.result?.url ||

                response.data?.link ||

                null;


            if (!uploadedUrl) {

                throw new Error(

                    "Upload service did not return a URL"

                );

            }


            /* ==========================================
               SEND RESULT
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📤 MEDIA UPLOADED 〕
│
│ Status: Success ✅
│
│ File Size:
│ ${(buffer.length / 1024 / 1024).toFixed(2)} MB
│
│ Download URL:
│ ${uploadedUrl}
│
╰───────────────
🤖 ${config.BOT_NAME}`

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

                "[TOURL COMMAND ERROR]",

                error.response?.data ||
                error.message

            );


            const errorMessage =

                error.response
                    ?.data
                    ?.message ||

                error.response
                    ?.data
                    ?.error ||

                error.message ||

                "Upload failed";


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

`╭─〔 ❌ UPLOAD FAILED 〕
│
│ ${errorMessage}
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