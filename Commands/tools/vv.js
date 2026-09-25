"use strict";

const config = require("../../config");

module.exports = {
    name: "vv",
    aliases: ["viewonce", "viewoncemedia"],
    category: "Tools",
    description: "Handle a quoted view-once message safely",

    async execute(context) {
        const { reply, quotedMessage } = context;

        if (!quotedMessage) {
            return reply(`❌ Reply to a view-once message with ${config.PREFIX}vv.\n\nFor privacy, this command does not bypass WhatsApp's view-once protection. Ask the sender to resend the media normally.`);
        }

        return reply(
            `👁️ *VIEW-ONCE MESSAGE*\n\n` +
            `This message is protected as view-once. ${config.BOT_NAME} will not copy or redistribute the protected media.\n\n` +
            `Please ask the sender to resend it as a normal image, video, audio, or document.\n\n` +
            `> ${config.BOT_NAME}\n` +
            `> Powered by ${config.CREATOR}`
        );
    }
};
