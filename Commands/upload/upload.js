const axios = require("axios");

const config = require("../../config");


/* ==========================================
   GENERAL UPLOAD COMMAND
========================================== */

module.exports = {

    name:
        "upload",


    aliases: [

        "sendfile",
        "fileupload"

    ],


    category:
        "Upload",


    description:
        "Upload replied media to the upload service",


    usage:
        ".upload (reply to media)",


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

        const contextInfo =
            msg.message
                ?.extendedTextMessage
                ?.contextInfo;


        const quotedMessage =
            contextInfo
                ?.quotedMessage;


        if (!quotedMessage) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📤 UPLOAD FILE 〕
│
│ Reply to an image, video,
│ audio or document.
│
│ Then send:
│
│ ${prefix}upload
│
│ Example:
│
│ [Reply to media]
│ ${prefix}upload
│
╰───────────────`

                },

                {

                    quoted: msg

                }

            );

        }


        /* ==========================================
           CHECK API CONFIGURATION
        ========================================== */

        const apiKey =
            config.API_KEYS?.UPLOAD ||
            config.API_KEYS?.GENERAL ||
            "";


        const uploadUrl =
            config.API_URLS?.UPLOAD ||
            "";


        if (!apiKey) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ CONFIGURATION ERROR 〕
│
│ UPLOAD_API_KEY is missing.
│
│ Add it inside your .env file.
│
╰───────────────`

                },

                {

                    quoted: msg

                }

            );

        }


        if (!uploadUrl) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ CONFIGURATION ERROR 〕
│
│ Upload service is not configured.
│
│ Please configure the upload
│ service endpoint.
│
╰───────────────`

                },

                {

                    quoted: msg

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

                            text: "⏳",

                            key: msg.key

                        }

                    }

                );

            } catch (error) {}


            /* ==========================================
               CREATE QUOTED MESSAGE OBJECT
            ========================================== */

            const quotedKey = {

                remoteJid:
                    chatId,


                fromMe:
                    false,


                id:
                    contextInfo?.stanzaId,


                participant:
                    contextInfo?.participant

            };


            /* ==========================================
               DOWNLOAD MEDIA
            ========================================== */

            const mediaBuffer =
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


            if (!mediaBuffer) {

                throw new Error(
                    "Failed to download the media"
                );

            }


            const buffer =
                Buffer.isBuffer(mediaBuffer)

                    ? mediaBuffer

                    : Buffer.from(mediaBuffer);


            /* ==========================================
               CHECK FILE SIZE
            ========================================== */

            const maxSize =
                config.UPLOAD?.MAX_FILE_SIZE ||
                100 * 1024 * 1024;


            if (
                buffer.length > maxSize
            ) {

                throw new Error(

                    `File exceeds the maximum allowed size of ${Math.floor(
                        maxSize / 1024 / 1024
                    )}MB`

                );

            }


            /* ==========================================
               GET MEDIA TYPE
            ========================================== */

            const mediaTypes = [

                "imageMessage",
                "videoMessage",
                "audioMessage",
                "documentMessage"

            ];


            let mediaType =
                "unknown";


            for (
                const type of mediaTypes
            ) {

                if (
                    quotedMessage[type]
                ) {

                    mediaType =
                        type.replace(
                            "Message",
                            ""
                        );

                    break;

                }

            }


            /* ==========================================
               PREPARE FILE
            ========================================== */

            const base64File =
                buffer.toString(
                    "base64"
                );


            /* ==========================================
               UPLOAD REQUEST
            ========================================== */

            const response =
                await axios.post(

                    uploadUrl,

                    {

                        file:
                            base64File,

                        type:
                            mediaType,

                        size:
                            buffer.length

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
               GET RESPONSE
            ========================================== */

            const result =
                response.data;


            const uploadedUrl =

                result?.url ||

                result?.data?.url ||

                result?.result?.url ||

                result?.link ||

                null;


            if (!uploadedUrl) {

                throw new Error(

                    "Upload completed but no URL was returned"

                );

            }


            /* ==========================================
               FORMAT FILE SIZE
            ========================================== */

            const sizeMB =
                (
                    buffer.length /
                    1024 /
                    1024
                ).toFixed(2);


            /* ==========================================
               SEND SUCCESS
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📤 FILE UPLOADED 〕
│
│ Status: Success ✅
│
│ Type: ${mediaType}
│ Size: ${sizeMB} MB
│
│ URL:
│ ${uploadedUrl}
│
╰───────────────
🤖 ${config.BOT_NAME}`

                },

                {

                    quoted: msg

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

                            text: "✅",

                            key: msg.key

                        }

                    }

                );

            } catch (error) {}


        } catch (error) {

            console.error(

                "[UPLOAD COMMAND ERROR]",

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

                            text: "❌",

                            key: msg.key

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
│ Try again later.
│
╰───────────────`

                },

                {

                    quoted: msg

                }

            );

        }

    }

};