import 'isomorphic-fetch';
import * as dotenv from 'dotenv'
dotenv.config()
import pkg from 'whatsapp-web.js';
import pkg2 from 'image-data-uri';
const { decode } = pkg2;
import fs from 'fs';
import { BingAIClient } from '@waylaidwanderer/chatgpt-api';
import qrcode from 'qrcode-terminal';
import { KeyvFile } from 'keyv-file';
import Jimp from 'jimp';
import dataUriToBuffer from 'data-uri-to-buffer';
const { Client, LocalAuth, MessageMedia } = pkg;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']}
});
const cacheOptions = { store: new KeyvFile({ filename: 'cache.json' }) }
const api = new BingAIClient({
    userToken: process.env.BING_COOKIE,
    cache: cacheOptions
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on("message", async message => {
    const allowedDB = JSON.parse(fs.readFileSync("./allowed.json"));
    const conversationsDB = JSON.parse(fs.readFileSync("./messages.json"));
    const quotedMessage = message.hasQuotedMsg ? await message.getQuotedMessage() : null
    const amIQuoted = quotedMessage ? (quotedMessage.fromMe ? true : false) : false
    const authorContact = await message.getContact();
    const chat = await message.getChat();
    if(message.body.startsWith("!eval")) {
        if(JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Solo el dueño del bot puede utilizar este comando");
        const args = message.body.split(" ").slice(1);
        if(!args.length) return message.reply("⚠ - Debes especificar un código para evaluar");
        try {
            const evaled = await eval(args.join(" "));
            return message.reply(`📥 - Evaluado:\n\`\`\`\n${args.join(" ")}\n\`\`\`\n📤 - Salida:\n\`\`\`\n${evaled}\n\`\`\``);
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        };
    };
    if(!chat.isGroup && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, pero mi uso solo está destinado para grupos");
    if(message.body.startsWith("!add-group") && JSON.stringify(authorContact.id) === JSON.stringify(allowedDB[0].owner)) {
        if(allowedDB[1].allowed_groups.find(x => JSON.stringify(x) === JSON.stringify(chat.id))) {
            let updatedDB = allowedDB;
            const elementIndex = allowedDB[1].allowed_groups.findIndex(x => x.user === chat.id.user);
            updatedDB[1].allowed_groups.splice(elementIndex, 1);
            try {
                fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
                return message.reply("✅ - Este grupo ha sido removido de la base de datos exitosamente");
            } catch(err) {
                return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
            };
        };
        let updatedDB = allowedDB;
        allowedDB[1].allowed_groups.push(chat.id);
        try {
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
            return message.reply("✅ - El nuevo grupo ha sido actualizado a la base de datos con exito");
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        }
    }
    if(message.body.startsWith("!ban-user") && JSON.stringify(authorContact.id) === JSON.stringify(allowedDB[0].owner)) {
        const args = message.body.split(" ").slice(1);
        const foundUser = await client.getNumberId(args.join(" ").replace("+", "").replace(/\s/g, "")).catch(() => null);
        if(!args.length) return message.reply("⚠ - Necesitas darme el número de alguien a quien banear");
        else if(!foundUser) return message.reply("⚠ - Al parecer ese número es inválido o no pertenece a nadie dentro de WhatsApp");
        else if(allowedDB[1].banned_users.some((x) => JSON.stringify(x) === JSON.stringify(foundUser))) {
            let updatedDB = allowedDB;
            const elementIndex = allowedDB[1].banned_users.findIndex(x => x.user === foundUser.user);
            updatedDB[1].banned_users.splice(elementIndex, 1);
            try {
                fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
                return message.reply(`✅ - El usuario *${await client.getFormattedNumber(args.join(" ").replace("+", "").replace(/\s/g, ""))}* ha sido desbaneado correctamente de usar el bot`);
            } catch(err) {
                return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
            };
        };
        let updatedDB = allowedDB;
        try {
            updatedDB[1].banned_users.push(foundUser);
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
            return message.reply(`✅ - El usuario *${await client.getFormattedNumber(args.join(" ").replace("+", "").replace(/\s/g, ""))}* ha sido baneado correctamente de usar el bot`);
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        };
    };
    if(message.body.startsWith("!sticker")) {
        const args = message.body.split(" ").slice(1);
        let matches = args.join(" ").match(/(["'])(?:(?=(\\?))\2.)*?\1/g) || (!args.length ? [] : [args.join(" ")]);
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        const targetMessage = quotedMessage || message;
        if(!targetMessage.hasMedia) return message.reply("⚠ - Necesitas enviar una imágen para convertirla en un sticker");
        try {
        const attachment = await targetMessage.downloadMedia();
        if(!matches.length) return client.sendMessage(message.from, attachment, { sendMediaAsSticker: true });
        if(matches.length > 2) {
            let toConcadenate = matches.slice(1);
            matches = [matches[0], toConcadenate.join(" ")];
        }
        const uri = `data:${attachment.mimetype};base64,${attachment.data}`;
        const buffer = dataUriToBuffer(uri);
        const img = await Jimp.read(buffer);
        const font = await Jimp.loadFont("./fonts/ComicNeue-Regular.fnt");
        img.cover(512, 512);
        for(let i = 0;i < matches.length;i++) {
            img.print(font, 10, 0, { text: matches[i].replace(/['"]+/g, ""), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: i % 2 === 0 ? Jimp.VERTICAL_ALIGN_TOP : Jimp.VERTICAL_ALIGN_BOTTOM }, img.bitmap.width, img.bitmap.height);
        }
        const base64 = await img.getBase64Async(Jimp.MIME_PNG);
        const decodedImage = decode(base64);
        const memeAttachment = new MessageMedia(decodedImage.imageType, decodedImage.dataBase64)
        return await client.sendMessage(message.from, memeAttachment, { sendMediaAsSticker: true })
    } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        }
    }
    else if(message.body.startsWith("!everyone")) {
        if(!chat.participants.some(x => JSON.stringify(x.id) === JSON.stringify(authorContact.id) && x.isAdmin)) return message.reply("⚠ - Este comando solo puede ser utilizado por administradores");
        try {
            await chat.sendMessage(chat.participants.map(x => "@" + x.id.user).join(", "), {
                mentions: chat.participants
            });
            return message.reply("✅")
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        };
     
    }
    else if(message.body.startsWith("!snipe")) {
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        const foundSnipe = allowedDB[0].sniped.find(x => x.chatId === message.from)
        if(!foundSnipe) return message.reply("😵 - No existe ningún snipe para este grupo en este momento");
        const snipedAuthor = await client.getContactById(foundSnipe.snipedAuthor)
        chat.sendMessage(`El usuario @${snipedAuthor.id.user} eliminó un mensaje con el siguiente contenido: ${foundSnipe.snipedMessage.body}`, {
            mentions: [snipedAuthor]
        })
    }
    else if(message.body.startsWith("!resume")) {
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        const args = message.body.split(" ").slice(1);
        try {
            const messagesLimit = args.length ? (isNaN(args[0]) && args[0] > 10 ? "Infinity" : args[0]) : "Infinity";
            const messages = await chat.fetchMessages({ limit: messagesLimit });
            const queryPrompt = `La siguiente es la lista de ${messagesLimit === "Infinity" ? "todos los mensajes" : "los últimos " + messagesLimit + " mensajes"} organizados desde los más antiguos hasta los más nuevos en el grupo ${chat.name} de WhatsApp. Resume de la mejor manera posible todo lo que ha pasado teniendo en cuenta los contextos de los mensajes y su relación entre sí, así mismo como los autores de cada mensaje.\n\n${messages.map(x => `${messages.indexOf(x) + 1} | @+${x.id.participant.user}: ${!x.body ? '[Imágen, archivo o sticker]' : x.body.length > 300 ? x.body.substring(0, 300) + "..." : x.body}`).join("\n")}`
            console.log(queryPrompt);
            await chat.sendStateTyping();
            const res = await api.sendMessage(queryPrompt, {
                jailbreakConversationId: true
            })
            const msg = await chat.sendMessage(res.response.replace(/\[\^\d+\^\]/g, ""), {
                mentions: chat.participants
            });
            let newConversation = conversationsDB;
            newConversation.push({ jailbreakConversationId: res.jailbreakConversationId, parentMessageId: res.messageId, response: msg.body })
            fs.writeFileSync("./messages.json", JSON.stringify(newConversation));
    } catch(err) {
        return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
    }
    }
    else if((await message.getMentions()).some(x => x.isMe) || amIQuoted) {
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        let jailbreakId = quotedMessage ? (quotedMessage.fromMe && conversationsDB.find(x => x.response === quotedMessage.body) ? conversationsDB.find(x => x.response === quotedMessage.body) : { jailbreakConversationId: true }) : { jailbreakConversationId: true };
        try {
        await chat.sendStateTyping()
        const bingPrompt = !message.body.replace("@15022654100", "").trim().length ? "¡Hola Sidney!" : message.body.replace("@15022654100", "").trim()
        const res = await api.sendMessage(bingPrompt, {
            ...jailbreakId
        });
        const msg = await message.reply(res.response.replace(/\[\^\d+\^\]/g, ""));
        let newConversation = conversationsDB;
        newConversation.push({ jailbreakConversationId: res.jailbreakConversationId, parentMessageId: res.messageId, response: msg.body })
        fs.writeFileSync("./messages.json", JSON.stringify(newConversation));
    } catch(err) {
        return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
    }
    };
});

client.on("message_revoke_everyone", async (message, revoked_msg) => {
    const updatedDB = JSON.parse(fs.readFileSync("./allowed.json"));
    const messageChat = await client.getChatById(message.from);
    if(!messageChat.isGroup || !revoked_msg || !revoked_msg.body || updatedDB[1].allowed_groups.some(x => JSON.stringify(x) !== JSON.stringify(messageChat))) return;
    if(updatedDB[0].sniped.some(x => x.chatId === revoked_msg.from)) {
        const toEdit = updatedDB[0].sniped.find(x => x.chatId === message.from);
        toEdit.snipedMessage = { body: revoked_msg.body, timestamp: revoked_msg.timestamp };
        toEdit.snipedAuthor = revoked_msg.author;
        try {
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        }
    }
    else {
        updatedDB[0].sniped.push({ chatId: message.from, snipedMessage: { body: revoked_msg.body, timestamp: revoked_msg.timestamp }, snipedAuthor: message.author })
        try {
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB))
    } catch(err) {
        return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
    }
}
})
client.initialize();