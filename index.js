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
// Import libraries and stuff

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']}
}); // Call new whatsapp-web.js instance

const cacheOptions = { store: new KeyvFile({ filename: 'cache.json' }) } // Create a databased that will save every conversation created with the bot
const api = new BingAIClient({
    userToken: process.env.BING_COOKIE,
    cache: cacheOptions
}); // Create new BingChat API session client

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
}); // Generate QR code to log into whatsapp-web bot's account

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on("message", async message => {
    const allowedDB = JSON.parse(fs.readFileSync("./allowed.json")); // Parse allowed.json, which contains all of the allowed groups, snipes, owner data and blacklisted people
    const conversationsDB = JSON.parse(fs.readFileSync("./messages.json")); // Parse messages.json, which saves conversations id's to be able to answer on the same Bing Chat conversation whenever quotting them back 
    const quotedMessage = message.hasQuotedMsg ? await message.getQuotedMessage() : null
    const amIQuoted = quotedMessage ? (quotedMessage.fromMe ? true : false) : false
    const authorContact = await message.getContact(); // console.log(authorContact.id) and paste yours one as owner propertie on allowed.json
    console.log(authorContact.id);
    const chat = await message.getChat(); // Get current chat
    if(message.body.toLowerCase().startsWith("!eval")) {
        if(JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Solo el dueño del bot puede utilizar este comando");
        // Check if author's message matches with owner's data, otherwise returns an error reply
        
        const args = message.body.split(" ").slice(1);
        if(!args.length) return message.reply("⚠ - Debes especificar un código para evaluar");
        try {
            const evaled = await eval(args.join(" "));
            return message.reply(`📥 - Evaluado:\n\`\`\`\n${args.join(" ")}\n\`\`\`\n📤 - Salida:\n\`\`\`\n${evaled}\n\`\`\``);
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        };
    };
    if(JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner) && allowedDB[1].allowed_users.some(x => JSON.stringify(x) !== JSON.stringify(authorContact.id))) return message.reply("⚠ - Lo siento, pero mi uso solo está destinado para grupos");
    // Checks if current chat is actually a group, and looks for owner's condition as author's command to bypass this
    
    if(message.body.toLowerCase().startsWith("!add-group") && JSON.stringify(authorContact.id) === JSON.stringify(allowedDB[0].owner)) {
        // Checks if author's command matches with owner's info
        
        if(allowedDB[1].allowed_groups.find(x => JSON.stringify(x) === JSON.stringify(chat.id))) {
            // If current group is already on allowed_groups database, remove it
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
        // Add group to database after checking that there was no matching mirrored data
        let updatedDB = allowedDB;
        allowedDB[1].allowed_groups.push(chat.id);
        try {
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
            return message.reply("✅ - El nuevo grupo ha sido actualizado a la base de datos con exito");
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        }
    }
    if(message.body.toLowerCase().startsWith("!add-user") && JSON.stringify(authorContact.id) === JSON.stringify(allowedDB[0].owner)) {
        // Checks if author's command matches with owner's data
        const args = message.body.split(" ").slice(1);
        const foundUser = await client.getNumberId(args.join(" ").replace("+", "").replace(/\s/g, "")).catch(() => null); // Retrieves the found user data in order to add them
        if(!args.length) return message.reply("⚠ - Necesitas darme el número de alguien a quien añadir");
        else if(!foundUser) return message.reply("⚠ - Al parecer ese número es inválido o no pertenece a nadie dentro de WhatsApp"); // Returns an error if no user is found
        else if(allowedDB[1].allowed_users.some((x) => JSON.stringify(x) === JSON.stringify(foundUser))) {
            // Checks if found user is already on allowed_users database
            let updatedDB = allowedDB;
            const elementIndex = allowedDB[1].allowed_users.findIndex(x => x.user === foundUser.user);
            updatedDB[1].allowed_users.splice(elementIndex, 1);
            try {
                fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
                return message.reply("✅ - Este usuario ha sido removido de la base de datos exitosamente");
            } catch(err) {
                return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
            };
        }
        // Add user to database after checking that there was no matching mirrored data
        let updatedDB = allowedDB;
        allowedDB[1].allowed_users.push(foundUser);
        try {
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
            return message.reply("✅ - El nuevo usuario ha sido actualizado a la base de datos con exito");
        }
        catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        }
    }
    if(message.body.toLowerCase().startsWith("!ban-user") && JSON.stringify(authorContact.id) === JSON.stringify(allowedDB[0].owner)) {
        // Checks if author's command matches with owner's data
        
        const args = message.body.split(" ").slice(1);
        const foundUser = await client.getNumberId(args.join(" ").replace("+", "").replace(/\s/g, "")).catch(() => null); // Retrieves the found user data in order to ban them
        if(!args.length) return message.reply("⚠ - Necesitas darme el número de alguien a quien banear");
        else if(!foundUser) return message.reply("⚠ - Al parecer ese número es inválido o no pertenece a nadie dentro de WhatsApp"); // Returns an error if no user is found
        else if(allowedDB[1].banned_users.some((x) => JSON.stringify(x) === JSON.stringify(foundUser))) {
            // Checks if found user is already listed on database, if so, we remove them from it
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
        // Bans the user and adds them to blacklist
        try {
            updatedDB[1].banned_users.push(foundUser);
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB));
            return message.reply(`✅ - El usuario *${await client.getFormattedNumber(args.join(" ").replace("+", "").replace(/\s/g, ""))}* ha sido baneado correctamente de usar el bot`);
        } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        };
    };
    if(message.body.toLowerCase().startsWith("!sticker")) {
        const args = message.body.split(" ").slice(1);
        let matches = args.join(" ").match(/(["'])(?:(?=(\\?))\2.)*?\1/g) || (!args.length ? [] : [args.join(" ")]); // Create a regex match to get every argument inside simple ' ' or double " " so that meme texts are caught
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        // Checks if the current group is present on allowed_groups db, otherwise returns this error
        
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        // Checks if current author's command is banned from the bot, checking them up on blacklist db
        
        const targetMessage = quotedMessage || message; // If there is no quoted message, we'll fetch current's message media
        
        if(!targetMessage.hasMedia) return message.reply("⚠ - Necesitas enviar una imágen para convertirla en un sticker"); // If no media is found, return an error
        
        try {
        const attachment = await targetMessage.downloadMedia();
        if(!matches.length) return client.sendMessage(message.from, attachment, { sendMediaAsSticker: true }); // Check if there are meme arguments
        if(matches.length > 2) {
            // If there are more than two " " arguments, we'll concadenate the rest of them to link texts as only two arrays of arguments
            let toConcadenate = matches.slice(1);
            matches = [matches[0], toConcadenate.join(" ")];
        }
        const uri = `data:${attachment.mimetype};base64,${attachment.data}`; // Retrieved sticker's image data
        const buffer = dataUriToBuffer(uri);
        const img = await Jimp.read(buffer); // Pass it to Jimp, in order to start editing with them
            
        const font = await Jimp.loadFont("./fonts/ComicNeue-Regular.fnt"); // Load pre-saved font for memes font to be displayed
        img.cover(512, 512); // Cover image size to get as much quality as possible on sticker resolution
            
        for(let i = 0;i < matches.length;i++) {
            img.print(font, 10, 0, { text: matches[i].replace(/['"]+/g, ""), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: i % 2 === 0 ? Jimp.VERTICAL_ALIGN_TOP : Jimp.VERTICAL_ALIGN_BOTTOM }, img.bitmap.width, img.bitmap.height);
        } // Create a for loop to go through every item on matches array, which are actually top text and bottom text (if any) to be set on meme image
           
        const base64 = await img.getBase64Async(Jimp.MIME_PNG); // Get base64 data to be able to send the already edited image through whatsapp message
        const decodedImage = decode(base64); // Decode base64 image info
            
        const memeAttachment = new MessageMedia(decodedImage.imageType, decodedImage.dataBase64) // Meme attachment to be sent after succesfully edited
        return await client.sendMessage(message.from, memeAttachment, { sendMediaAsSticker: true })
    } catch(err) {
            return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
        }
    }
    else if(message.body.toLowerCase().startsWith("!everyone")) {
        
        // Mention everyone in the current DM group
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
    else if(message.body.toLowerCase().startsWith("!snipe")) {
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        // Regular checks to match with blacklist info
        
        const foundSnipe = allowedDB[0].sniped.find(x => x.chatId === message.from) // Retrieve latest snipe's data from DB
        
        if(!foundSnipe) return message.reply("😵 - No existe ningún snipe para este grupo en este momento"); // If no snipe found, return reply error
        const snipedAuthor = await client.getContactById(foundSnipe.snipedAuthor) // Get info from sniped author by using its contact string id (saved before into db)
        
        chat.sendMessage(`El usuario @${snipedAuthor.id.user} eliminó un mensaje con el siguiente contenido: ${foundSnipe.snipedMessage.body}`, {
            mentions: [snipedAuthor]
        }) // Send snipe message
    }
    else if(message.body.toLowerCase().startsWith("!resume")) {
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        // Blacklist checks
        
        const args = message.body.split(" ").slice(1);
        try {
            const messagesLimit = args.length ? (isNaN(args[0]) && args[0] > 10 ? "Infinity" : args[0]) : "Infinity";
            const messages = await chat.fetchMessages({ limit: messagesLimit });
            const queryPrompt = `La siguiente es la lista de ${messagesLimit === "Infinity" ? "todos los mensajes" : "los últimos " + messagesLimit + " mensajes"} organizados desde los más antiguos hasta los más nuevos en el grupo ${chat.name} de WhatsApp. Resume de la mejor manera posible todo lo que ha pasado teniendo en cuenta los contextos de los mensajes y su relación entre sí, así mismo como los autores de cada mensaje.\n\n${messages.map(x => `${messages.indexOf(x) + 1} | @+${x.id.participant.user}: ${!x.body ? '[Imágen, archivo o sticker]' : x.body.length > 300 ? x.body.substring(0, 300) + "..." : x.body}`).join("\n")}`
            // queryPrompt that will be passed to BingAPI prompt, giving it instructions to resume (last [amount of messages]) or (every single message) in group, you can change the response above for it to match with your language
            
            console.log(queryPrompt); // Debugging purporses OwO
            
            await chat.sendStateTyping(); // Sends a send typing state for current chat until message is finally sent
            
            const res = await api.sendMessage(queryPrompt, {
                jailbreakConversationId: true
            }) // Api call
            
            const msg = await chat.sendMessage(res.response.replace(/\[\^\d+\^\]/g, ""), {
                mentions: chat.participants // Mentions whoever was mentioned during chat analysis by AI
            });
            
            let newConversation = conversationsDB;
            newConversation.push({ jailbreakConversationId: res.jailbreakConversationId, parentMessageId: res.messageId, response: msg.body })
            fs.writeFileSync("./messages.json", JSON.stringify(newConversation));
            // Pushes this new conversation to be able to ask them about it later
    } catch(err) {
        return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
    }
    }
    else if((await message.getMentions()).some(x => x.isMe) || amIQuoted) {
        if(!allowedDB[1].allowed_groups.some(x => JSON.stringify(x) === JSON.stringify(chat.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, no se tiene permitido mi uso en este grupo.");
        if(allowedDB[1].banned_users.some(x => JSON.stringify(x) === JSON.stringify(authorContact.id)) && JSON.stringify(authorContact.id) !== JSON.stringify(allowedDB[0].owner)) return message.reply("⚠ - Lo siento, estás baneado de usar este bot.");    
        // Blacklist checks
        
        let jailbreakId = quotedMessage ? (quotedMessage.fromMe && conversationsDB.find(x => x.response === quotedMessage.body) ? conversationsDB.find(x => x.response === quotedMessage.body) : { jailbreakConversationId: true }) : { jailbreakConversationId: true };
        // Getting jailbreakId to follow the desired or quoted conversation as indicated
        
        try {
        await chat.sendStateTyping() // Send normal typing state until message is sent
            
        const bingPrompt = !message.body.replace("@15022654100", "").trim().length ? "¡Hola Sidney!" : message.body.replace("@15022654100", "").trim()
        const res = await api.sendMessage(bingPrompt, {
            ...jailbreakId
        }); // Make an api call to AI for it to look for referred conversation
            
        const msg = await message.reply(res.response.replace(/\[\^\d+\^\]/g, "")); // Send api message
   
        let newConversation = conversationsDB;
        newConversation.push({ jailbreakConversationId: res.jailbreakConversationId, parentMessageId: res.messageId, response: msg.body })
        fs.writeFileSync("./messages.json", JSON.stringify(newConversation));
        // Push the new conversation for us to be able to follow it later just by replying back to any of the messages
            
    } catch(err) {
        return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
    }
    };
});

// triggers on message delete
client.on("message_revoke_everyone", async (message, revoked_msg) => {
    // Fetches allowed.json db to push .sniped value
    const updatedDB = JSON.parse(fs.readFileSync("./allowed.json"));
    
    const messageChat = await client.getChatById(message.from);
    if(!messageChat.isGroup || !revoked_msg || !revoked_msg.body || updatedDB[1].allowed_groups.some(x => JSON.stringify(x) !== JSON.stringify(messageChat))) return;
    // If current chat where message was deleted isn't a group, revoked_msg was null, or simply the current group isn't added into allowed groups db, return nothing
    
    if(updatedDB[0].sniped.some(x => x.chatId === revoked_msg.from)) {
        
        // If there is already an snipe for current group chat, overwrite it with the new info
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
        // Pushes the new sniped data to sniped propertie [0] on allowed.json
        updatedDB[0].sniped.push({ chatId: message.from, snipedMessage: { body: revoked_msg.body, timestamp: revoked_msg.timestamp }, snipedAuthor: message.author })
        try {
            fs.writeFileSync("./allowed.json", JSON.stringify(updatedDB))
    } catch(err) {
        return message.reply(`😵 - Ha ocurrido un error inesperado:\n\`\`\`\n${err}\n\`\`\``);
    }
}
})
client.initialize();
