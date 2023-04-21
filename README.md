
# WhatsApp Bot - Images manipulation, AI powered and friendly user usage

Yet another multipurpose WhatsApp bot powered by whatsapp-web.js NPM library.
## Features

- Unrestricted GPT-4 chatbot version which can answer you to whatever you ask! (head to FAQ for more info)
- Create stickers just by quotting messages containing the desired media or giving them
- Manipulate stickers images to make it so you can get them as custom memes
- Crashes and bugs free

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

## Support

For support, just create a new issue.


