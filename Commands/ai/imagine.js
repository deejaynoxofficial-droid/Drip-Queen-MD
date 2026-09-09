const axios = require("axios");

const config = require("../../config");


/* ==========================================
   AI IMAGE GENERATION COMMAND
========================================== */

module.exports = {

    name:
        "imagine",


    aliases: [

        "image",
        "aiimage",
        "generate"

    ],


    category:
        "AI",


    description:
        "Generate an AI image from text",


    usage:
        ".imagine <description>",


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
           GET PROMPT
        ========================================== */

        const prompt =
            args.join(" ").trim();


        if (!prompt) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎨 AI IMAGE GENERATOR 〕
│
│ Create an image using AI.
│
│ Usage:
│ ${prefix}imagine <description>
│
│ Examples:
│ ${prefix}imagine A futuristic city at night
│
│ ${prefix}imagine A beautiful African queen
│
│ ${prefix}imagine A cyberpunk DJ studio
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
           CHECK OPENAI API KEY
        ========================================== */

        const apiKey =
            config.API_KEYS?.OPENAI;


        if (!apiKey) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ IMAGE ERROR 〕
│
│ OPENAI_API_KEY is missing.
│
│ Add your OpenAI API key
│ inside the .env file.
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
                                "🎨",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            /* ==========================================
               GENERATE IMAGE
            ========================================== */

            const response =
                await axios.post(

                    "https://api.openai.com/v1/images/generations",

                    {

                        model:
                            "gpt-image-1",


                        prompt:
                            prompt,


                        size:
                            "1024x1024",


                        quality:
                            "medium",


                        n:
                            1

                    },

                    {

                        headers: {

                            Authorization:
                                `Bearer ${apiKey}`,


                            "Content-Type":
                                "application/json"

                        },


                        timeout:
                            120000

                    }

                );


            /* ==========================================
               GET IMAGE DATA
            ========================================== */

            const imageData =
                response.data
                    ?.data?.[0];


            if (!imageData) {

                throw new Error(

                    "AI did not return an image"

                );

            }


            let imageBuffer;


            /* ==========================================
               BASE64 IMAGE RESPONSE
            ========================================== */

            if (
                imageData.b64_json
            ) {

                imageBuffer =
                    Buffer.from(

                        imageData.b64_json,

                        "base64"

                    );

            }


            /* ==========================================
               IMAGE URL RESPONSE
            ========================================== */

            else if (
                imageData.url
            ) {

                const imageResponse =
                    await axios.get(

                        imageData.url,

                        {

                            responseType:
                                "arraybuffer",


                            timeout:
                                120000

                        }

                    );


                imageBuffer =
                    Buffer.from(
                        imageResponse.data
                    );

            }


            else {

                throw new Error(

                    "No image data received"

                );

            }


            /* ==========================================
               SEND GENERATED IMAGE
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    image:
                        imageBuffer,


                    caption:

`╭─〔 🎨 AI GENERATED IMAGE 〕
│
│ Prompt:
│ ${prompt}
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

                "[IMAGINE COMMAND ERROR]",

                error.response?.data ||
                error.message

            );


            let errorMessage =
                "Failed to generate image";


            if (
                error.response
                    ?.data
                    ?.error
                    ?.message
            ) {

                errorMessage =
                    error.response
                        .data
                        .error
                        .message;

            }

            else if (
                error.message
            ) {

                errorMessage =
                    error.message;

            }


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

`╭─〔 ❌ IMAGE GENERATION ERROR 〕
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