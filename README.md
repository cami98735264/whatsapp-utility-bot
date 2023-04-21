
# WhatsApp Bot - Images manipulation, AI powered and friendly user usage

Yet another multipurpose WhatsApp bot powered by whatsapp-web.js NPM library.
## Features

- Unrestricted GPT-4 chatbot version which can answer you to whatever you ask! (head to FAQ for more info) 💫
- Create stickers just by quotting messages containing the desired media or giving them 📱
- Manipulate stickers images to make it so you can get them as custom memes 😁
- Owner only commands (eval, add-group, ban-user) 🛡️
- Blacklist system 🐈‍⬛
- Resumes a chat by giving the last messages amount to work on 🍞
- Incorporates an snipe command to retrieve the last deleted message on current group 🔫
- Mentions everyone on a group (admins only) 🔨
- Error handling 📌
- Crashes and bugs free (main branch) 🐛

## Installation

Install the whatsapp-web.js NPM library and all of the required packages and dependencies as explained below

```bash
  npm install whatsapp-web.js --save
  npm install --save
```

## Run Locally

Clone the project

```bash
  git clone https://github.com/Camilo5819/whatsapp-utility-bot.git
```

Go to the project directory

```bash
  cd my-project
```

Install dependencies

```bash
  npm install
```

Start the bot

```bash
  npm run start
```

## FAQ

#### What should I replace .env BING_COOKIE value for?

Go to https://bing.com/chat, login with your main account, press Ctrl + Shift + I, head to application tab and you'll see a Cookies section, select https://bing.com/chat and look for "_U" cookie value, once found, copy its value and paste it as BING_COOKIE value on .env file.

#### The bot gives an error once in a while when asking him questions

It's a completely normal behaviour, note that we are using a reverse engineering method to access Microsoft's Sidney AI, which is their old GPT-4 powered chatbot version (less restricted version), so there may be sometimes a couple errors when fetching and making requests to the pre-used API.

#### Why won't the bot answer to other users or work properly in direct messages?

The bot was first made to be only group compatible, but owners can bypass this easily, just paste your contact id object to owner field on allowed.json database (you can also console.log authorContact, which is a variable used to get author command's contact, so use it at first and paste its value to the mentioned propertie!)

#### Why won't the bot work in DM groups?

As explained above, the bot is intended to be used on dm groups other than direct messages, so you can make use of `!add-group` command to add a group to allowed groups database (allowed.json), after that you will be able to use all of the bot's functions on the targetted group correctly

#### Which ones are the bot's commands?

- `!sticker [optional:"top text for meme" "bottom text for meme"]` or just `!sticker top text for meme` (creates whatsapp stickers by providing image media, contained on quotted messages or adjunted message files. Optional meme options)
- `!eval args` (just as it sounds, it is an eval command specifically designed for bot's owner)
- `!ban-user phone_number` **(i.g !ban-user +1345748234)** (bans an user from using the bot, after adding the user to blacklist, they won't be able to use any of the bot's functions)
- `!add-group` (adds the current group where command was ran to allowed groups database, this lets the bot be used in there)
- `!snipe` (retrieves the last deleted message data on current group and tells whose the last message and what its content is)
- `!everyone` (mentions all of the participants in current group)
- `!resume messages_amount` (resumes the last given messages amount [it's very likely to crash or simply not work because of fetching that many messages, so be careful with the given amount])


## Support

For support, just create a new issue.


