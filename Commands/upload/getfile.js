const config = require("../../config");


/* ==========================================
   GET FILE COMMAND
========================================== */

module.exports = {

    name:
        "getfile",


    aliases: [

        "fileinfo",
        "mediainfo",
        "inspectfile"

    ],


    category:
        "Upload",


    description:
        "Display information about a replied file",


    usage:
        ".getfile (reply to media)",


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

`╭─〔 📁 FILE INFORMATION 〕
│
│ Reply to an image, video,
│ audio or document.
│
│ Then send:
│
│ ${prefix}getfile
│
│ Example:
│
│ [Reply to media]
│ ${prefix}getfile
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
               DETECT MEDIA TYPE
            ========================================== */

            let media =
                null;


            let mediaType =
                "Unknown";


            let fileName =
                "Unknown";


            const mediaMap = {

                imageMessage:
                    "Image",


                videoMessage:
                    "Video",


                audioMessage:
                    "Audio",


                documentMessage:
                    "Document",


                stickerMessage:
                    "Sticker"

            };


            for (
                const type of Object.keys(mediaMap)
            ) {

                if (
                    quotedMessage[type]
                ) {

                    media =
                        quotedMessage[type];


                    mediaType =
                        mediaMap[type];


                    break;

                }

            }


            /* ==========================================
               CHECK MEDIA
            ========================================== */

            if (!media) {

                return await sock.sendMessage(

                    chatId,

                    {

                        text:

`╭─〔 ❌ UNSUPPORTED FILE 〕
│
│ Please reply to:
│
│ 🖼️ Image
│ 🎥 Video
│ 🎵 Audio
│ 📄 Document
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
               GET FILE NAME
            ========================================== */

            if (
                media.fileName
            ) {

                fileName =
                    media.fileName;

            }

            else if (
                mediaType === "Image"
            ) {

                fileName =
                    "image-file";

            }

            else if (
                mediaType === "Video"
            ) {

                fileName =
                    "video-file";

            }

            else if (
                mediaType === "Audio"
            ) {

                fileName =
                    "audio-file";

            }

            else if (
                mediaType === "Sticker"
            ) {

                fileName =
                    "sticker-file";

            }


            /* ==========================================
               MIME TYPE
            ========================================== */

            const mimeType =
                media.mimetype ||
                "Unknown";


            /* ==========================================
               FILE SIZE
            ========================================== */

            let fileSize =
                Number(
                    media.fileLength ||
                    media.fileSize ||
                    0
                );


            let formattedSize =
                "Unknown";


            if (
                fileSize > 0
            ) {

                formattedSize =
                    formatFileSize(
                        fileSize
                    );

            }


            /* ==========================================
               DIMENSIONS
            ========================================== */

            let dimensions =
                "Not available";


            if (
                media.width &&
                media.height
            ) {

                dimensions =
                    `${media.width} × ${media.height}`;

            }


            /* ==========================================
               DURATION
            ========================================== */

            let duration =
                "Not available";


            if (
                media.seconds
            ) {

                duration =
                    formatDuration(
                        Number(
                            media.seconds
                        )
                    );

            }


            /* ==========================================
               FILE HASH
            ========================================== */

            let fileHash =
                "Not available";


            if (
                media.fileSha256
            ) {

                try {

                    fileHash =
                        Buffer
                            .from(
                                media.fileSha256
                            )
                            .toString(
                                "base64"
                            )
                            .substring(
                                0,
                                20
                            ) + "...";

                } catch (error) {}

            }


            /* ==========================================
               MEDIA FLAGS
            ========================================== */

            const isGif =
                media.gifPlayback === true
                    ? "Yes"
                    : "No";


            const isVoiceNote =
                media.ptt === true
                    ? "Yes"
                    : "No";


            /* ==========================================
               CREATE RESPONSE
            ========================================== */

            const fileInfo =

`╭─〔 📁 FILE INFORMATION 〕
│
│ 📌 Type: ${mediaType}
│ 📄 Name: ${fileName}
│
│ 🧾 MIME:
│ ${mimeType}
│
│ 📦 Size:
│ ${formattedSize}
│
│ 📐 Dimensions:
│ ${dimensions}
│
│ ⏱️ Duration:
│ ${duration}
│
│ 🎞️ GIF:
│ ${isGif}
│
│ 🎙️ Voice Note:
│ ${isVoiceNote}
│
│ 🔐 File ID:
│ ${fileHash}
│
╰───────────────
🤖 ${config.BOT_NAME}`;


            /* ==========================================
               SEND RESULT
            ========================================== */

            return await sock.sendMessage(

                chatId,

                {

                    text:
                        fileInfo

                },

                {

                    quoted:
                        msg

                }

            );


        } catch (error) {

            console.error(

                "[GETFILE COMMAND ERROR]",

                error.message

            );


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ ERROR 〕
│
│ Failed to read file
│ information.
│
│ ${error.message}
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


/* ==========================================
   FORMAT FILE SIZE
========================================== */

function formatFileSize(bytes) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return "Unknown";

    }


    const units = [

        "Bytes",
        "KB",
        "MB",
        "GB"

    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    const size =
        bytes /
        Math.pow(
            1024,
            index
        );


    return (
        `${size.toFixed(2)} ${units[index]}`
    );

}


/* ==========================================
   FORMAT DURATION
========================================== */

function formatDuration(seconds) {

    if (
        !seconds ||
        seconds <= 0
    ) {

        return "Not available";

    }


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const remainingSeconds =
        Math.floor(
            seconds % 60
        );


    if (
        hours > 0
    ) {

        return `${hours}h ${minutes}m ${remainingSeconds}s`;

    }


    if (
        minutes > 0
    ) {

        return `${minutes}m ${remainingSeconds}s`;

    }


    return `${remainingSeconds}s`;

}