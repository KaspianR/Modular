const discord = require('discord.js');
const fs = require('fs');
const https = require('https');
const express = require('express');
const handlebars = require('express-handlebars');
const fetch = require('node-fetch');
const FormData = require('form-data');
const cookies = require("cookie-parser");
const crypto = require('crypto');
var bodyParser = require("body-parser");

const{
    token,
    id,
    secret
} = require('./config.json');

const port = 80;

const client = new discord.Client();
client.login(token);

client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => { console.log('Reconnecting!'); });
client.once('disconnect', () => { console.log('Disconnect!'); });

client.on("guildCreate", guild => {
    //Copy the default config file and name it after the server
    fs.copyFile('default.json', 'saves/' + guild.id + '.json', (err) => {
        if (err) throw err;
    });
});

client.on('message', async message => {
    if (message.author.bot) return;

    fs.readFile('saves/' + message.guild.id + ".json", 'utf8', function(err, text){

        if(err) {
            
            //Add error managing here

        };

        let data = JSON.parse(text);

        if(!message.content.startsWith(data.Prefix)) return

        if(message.content.startsWith(`${data.Prefix}rules`)) {
            if(data.SendRulesInDifferentMessages){
                for(let i = 0; i < data.Rules.length; i++){
                    let embed = new discord.MessageEmbed();
                    embed.setTitle(`${data.Rules[i].Title} (${data.Rules[i].Infractions} ${data.Rules[i].Infractions == 1 ? 'strike' : 'strikes'})`);
                    embed.setColor(data.RuleColor);
                    embed.setDescription(data.Rules[i].Description);
                    message.channel.send(embed);
                }
            }
            else{
                let embed = new discord.MessageEmbed();
                embed.setTitle("Rules");
                embed.setColor(data.RuleColor);
                for(let i = 0; i < data.Rules.length; i++){
                    embed.addField(`${data.Rules[i].Title} (${data.Rules[i].Infractions} ${data.Rules[i].Infractions == 1 ? 'strike' : 'strikes'})`, data.Rules[i].Description);
                }
                message.channel.send(embed);
            }
            message.delete();
            return;
        }
        else if(message.content.startsWith(`${data.Prefix}ban`)) {
            SendBanMessage(message, data);
        }
        else if(message.content.startsWith(`${data.Prefix}kick`)) {
            SendKickMessage(message, data);
        }
        else if(message.content.startsWith(`${data.Prefix}infraction`)) {
            SendInfractionMessage(message, data);
        }
        else if(message.content.startsWith(`${data.Prefix}warn`)) {
            SendWarnMessage(message, data);
        }

    });

});

const app = express();

app.set('view engine', 'handlebars');

app.engine('handlebars', handlebars({
    layoutsDir: __dirname + '/views'
}));

app.use(express.static('public'));
app.use(cookies());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {

    res.render('sites/home', {layout : 'partials/frame', Title: "Home", Name: "home", CustomScript: false, Selected: {Home: true, Features: false, Dashboard: false, Help: false}});

});

app.get('/features', (req, res) => {

    res.render('sites/features', {layout : 'partials/frame', Title: "Home", Name: "home", CustomScript: false, Selected: {Home: false, Features: true, Dashboard: false, Help: false}});

});

app.get('/help', (req, res) => {

    res.render('sites/help', {layout : 'partials/frame', Title: "Home", Name: "home", CustomScript: false, Selected: {Home: false, Features: false, Dashboard: false, Help: true}});

});

app.get('/dashboard', (req, res) => {

    res.render('sites/dashboard', {
        layout : 'partials/frame',
        Title: "Select a server",
        Name: "Dashboard",
        CustomScript: true,
        Selected: {Home: false, Features: false, Dashboard: true, Help: false}
    });

});

app.get('/dashboard/:id', (req, res) => {

    session = GetSession(req);

    if(session){

        res.render('sites/settings', {
            layout : 'partials/frame',
            Title: "Dashboard",
            Name: "settings",
            CustomScript: true,
            Selected: {Home: false, Features: false, Dashboard: true, Help: false}
        });

    }
    else{

        res.send("Not signed in");

    }

});

app.get('/login', (req, res) => {

    const data = new FormData();

    data.append('client_id', id);
    data.append('client_secret', secret);
    data.append('grant_type', 'authorization_code');
    data.append('redirect_uri', 'http://localhost/login');
    data.append('scope', 'identify guilds');
    data.append('code', req.query.code);

    fetch('https://discordapp.com/api/oauth2/token', {
        method: 'POST',
        body: data,
    })
    .then(response => response.json())
    .then(response => {
        let sessions = JSON.parse(fs.readFileSync("sessions.json"));

        let key = GenerateKey();

        let d = new Date();
        let t = d.getTime();

        sessions.push({"SessionID": key, "ExpiresAt": t + 432000000, "AccessToken": response.access_token, "TokenType": response.token_type});
        fs.writeFileSync("sessions.json", JSON.stringify(sessions, null, 4));

        res.cookie('session', key);

        res.redirect("/dashboard");
    });

});

app.get('/api/user', (req, res) => {

    session = GetSession(req);

    if(session){

        fetch('https://discordapp.com/api/users/@me', {headers: {authorization: session.TokenType + ' ' + session.AccessToken}}).then(response => response.json())
        .then(response => {
            res.send(JSON.stringify({name: response.username, url: `https://cdn.discordapp.com/avatars/${response.id}/${response.avatar}.png?size=128`}));
        });

    }
    else{

        res.send("Not signed in");

    }

});

app.get('/api/guilds', (req, res) => {

    session = GetSession(req);

    if(session){

        ReturnGuilds(`${session.TokenType} ${session.AccessToken}`, (guilds) => {
            guilds = guilds.filter(g => GotPermission(g.permissions));
            ReturnGuilds(`Bot ${token}`, (bot) => {
                let botIDs = bot.map(g => g.id);
                guilds.forEach(g => g.active = botIDs.includes(g.id));
                guilds.sort((a, b) => b.active - a.active);
                res.send(guilds);
            });
        });

    }
    else{

        res.send("Not signed in");

    }

});

app.get('/api/settings/get/:id', (req, res) => {

    session = GetSession(req);

    if(session){

        fs.readFile(`saves/${req.params.id}.json`, (err, data) => {

            if (err) throw err;

            let obj = JSON.parse(data);

            res.send(JSON.stringify({
                CommandPrefix: obj.Prefix,
                PublicLogID: obj.PublicLogID,
                KickAfterInfractions: obj.KickAfterInfractions,
                BanAfterInfractions: obj.BanAfterInfractions,
                Rules: obj.Rules,
                SendRulesInDifferentMessages: obj.SendRulesInDifferentMessages,
                RuleColor: obj.RuleColor
            }));

        });

    }
    else{

        res.send("Not signed in");

    }

});

app.post('/api/settings/set/:id', (req, res) => {

    session = GetSession(req);

    if(session){

        let obj = JSON.parse(fs.readFileSync(`saves/${req.params.id}.json`));

        obj.CommandPrefix = req.body.CommandPrefix;
        obj.PublicLogID = req.body.PublicLogID;
        obj.KickAfterInfractions = Number(req.body.KickAfterInfractions);
        obj.BanAfterInfractions = Number(req.body.BanAfterInfractions);
        obj.Rules = req.body.Rules;
        obj.SendRulesInDifferentMessages = req.body.SendRulesInDifferentMessages;
        obj.RuleColor = req.body.RuleColor;

        obj.Rules.forEach(r => Number(r.Infractions));

        if(!isNaN(obj.KickAfterInfractions) && !isNaN(obj.BanAfterInfractions) && VerifyRuleInfractions(obj.Rules)){

            fs.writeFileSync(`saves/${req.params.id}.json`, JSON.stringify(obj, null, 4));

            res.send('Saved');

        }
        else{

            res.send('Invalid input');

        }

    }
    else{

        res.send("Not signed in");

    }

});

app.listen(port);

function GotPermission(perm){

    if((perm & 8) == 8 || (perm & 16) == 16) return true;

    return false;

}

function ReturnGuilds(authorization, callback){

    fetch('https://discordapp.com/api/users/@me/guilds', {headers: {authorization: authorization}}).then(response => response.json())
    .then(response => {
        if(response.message == 'You are being rate limited.'){
            setTimeout(() => {ReturnGuilds(authorization, callback)}, response.retry_after)
        }
        else{
            callback(response);
        }
    });

}

function GenerateKey() {
    return crypto.randomBytes(64).toString('base64');
}

function GetSession(req){
    if(req.cookies.session){
        let sessions = JSON.parse(fs.readFileSync("sessions.json"));
        let d = new Date();
        let t = d.getTime();
        for(let i = sessions.length - 1; i >= 0; i--){
            if(sessions[i].ExpiresAt <= t){
                sessions.splice(i);
                fs.writeFileSync("sessions.json", JSON.stringify(sessions, null, 4));
            }
            else if(sessions[i].SessionID == req.cookies.session){
                let d = new Date();
                let t = d.getTime();
                sessions[i].ExpiresAt = t + 432000000;
                fs.writeFileSync("sessions.json", JSON.stringify(sessions, null, 4));
                return {AccessToken: sessions[i].AccessToken, TokenType: sessions[i].TokenType};
            }
        }
    }
    return false;
}

function SendBanMessage(message, data){
    client.channels.fetch(data.PublicLogID).then(channel => {
        SendActualBanMessage(message, data, channel);
    }).catch(() => {
        SendActualBanMessage(message, data, message.channel);
    });
}

function SendActualBanMessage(message, data, channel){
    if(message.mentions.members.array().length == 1){
        if(message.mentions.members.first().bannable){
            message.mentions.members.first().ban();
            let embed = new discord.MessageEmbed();
            embed.setAuthor(`${message.mentions.members.first().user.username}#${message.mentions.members.first().user.discriminator} just got banned`, message.mentions.members.first().user.avatar ? `https://cdn.discordapp.com/avatars/${message.mentions.members.first().user.id}/${message.mentions.members.first().user.avatar}.png?size=128` : message.mentions.members.first().user.defaultAvatarURL);
            if(message.content.length > data.Prefix.length + 8 + message.author.id.length) embed.addField("**Reason: **", message.content.substring(data.Prefix.length + 8 + message.author.id.length, message.content.length));
            embed.addField("**Moderator: **", `<@${message.author.id}>`);
            embed.setColor(0xFD413C);
            channel.send(embed);
            channel.send(`<@${message.author.id}>`).then(m => m.delete());
            message.delete();
        }
        else{
            let embed = new discord.MessageEmbed();
            embed.setTitle('Something went wrong...')
            embed.setColor(0xff0000);
            embed.setDescription("That user can't be banned");
            message.channel.send(embed);
            message.delete();
        }
    }
    else{
        let embed = new discord.MessageEmbed();
        embed.setTitle('Something went wrong...')
        embed.setColor(0xff0000);
        embed.setDescription('The command was not entered correctly');
        message.channel.send(embed);
        message.delete();
    }
}

function SendKickMessage(message, data){
    client.channels.fetch(data.PublicLogID).then(channel => {
        SendActualKickMessage(message, data, channel);
    }).catch(() => {
        SendActualKickMessage(message, data, message.channel);
    });
}

function SendActualKickMessage(message, data, channel){
    if(message.mentions.members.array().length == 1){
        if(message.mentions.members.first().kickable){
            message.mentions.members.first().kick();
            let embed = new discord.MessageEmbed();
            embed.setAuthor(`${message.mentions.members.first().user.username}#${message.mentions.members.first().user.discriminator} just got kicked`, message.mentions.members.first().user.avatar ? `https://cdn.discordapp.com/avatars/${message.mentions.members.first().user.id}/${message.mentions.members.first().user.avatar}.png?size=128` : message.mentions.members.first().user.defaultAvatarURL);
            if(message.content.length > data.Prefix.length + 9 + message.author.id.length) embed.addField("**Reason: **", message.content.substring(data.Prefix.length + 9 + message.author.id.length, message.content.length));
            embed.addField("**Moderator: **", `<@${message.author.id}>`);
            embed.setColor(0xFD413C);
            channel.send(embed);
            channel.send(`<@${message.author.id}>`).then(m => m.delete());
            message.delete();
        }
        else{
            let embed = new discord.MessageEmbed();
            embed.setTitle('Something went wrong...')
            embed.setColor(0xff0000);
            embed.setDescription("That user can't be kicked");
            message.channel.send(embed);
            message.delete();
        }
    }
    else{
        let embed = new discord.MessageEmbed();
        embed.setTitle('Something went wrong...')
        embed.setColor(0xff0000);
        embed.setDescription('The command was not entered correctly');
        message.channel.send(embed);
        message.delete();
    }
}

function SendInfractionMessage(message, data){
    client.channels.fetch(data.PublicLogID).then(channel => {
        SendActualInfractionMessage(message, data, channel);
    }).catch(() => {
        SendActualInfractionMessage(message, data, message.channel);
    });
}

function SendActualInfractionMessage(message, data, channel){
    if(message.mentions.members.array().length == 1){
        let embed = new discord.MessageEmbed();
        embed.setAuthor(`${message.mentions.members.first().user.username}#${message.mentions.members.first().user.discriminator} just got an infraction`, message.mentions.members.first().user.avatar ? `https://cdn.discordapp.com/avatars/${message.mentions.members.first().user.id}/${message.mentions.members.first().user.avatar}.png?size=128` : message.mentions.members.first().user.defaultAvatarURL);
        if(message.content.length > data.Prefix.length + 15 + message.author.id.length) embed.addField("**Reason: **", message.content.substring(data.Prefix.length + 15 + message.author.id.length, message.content.length));
        embed.addField("**Moderator: **", `<@${message.author.id}>`);
        embed.setColor(0xFD413C);
        channel.send(embed);
        channel.send(`<@${message.author.id}>`).then(m => m.delete());
        message.delete();
    }
    else{
        let embed = new discord.MessageEmbed();
        embed.setTitle('Something went wrong...')
        embed.setColor(0xff0000);
        embed.setDescription('The command was not entered correctly');
        message.channel.send(embed);
        message.delete();
    }
}

function SendWarnMessage(message, data){
    client.channels.fetch(data.PublicLogID).then(channel => {
        SendActualWarnMessage(message, data, channel);
    }).catch(() => {
        SendActualWarnMessage(message, data, message.channel);
    });
}

function SendActualWarnMessage(message, data, channel){
    if(message.mentions.members.array().length == 1){
        let embed = new discord.MessageEmbed();
        embed.setAuthor(`${message.mentions.members.first().user.username}#${message.mentions.members.first().user.discriminator} just got warned`, message.mentions.members.first().user.avatar ? `https://cdn.discordapp.com/avatars/${message.mentions.members.first().user.id}/${message.mentions.members.first().user.avatar}.png?size=128` : message.mentions.members.first().user.defaultAvatarURL);
        if(message.content.length > data.Prefix.length + 9 + message.author.id.length) embed.addField("**Reason: **", message.content.substring(data.Prefix.length + 9 + message.author.id.length, message.content.length));
        embed.addField("**Moderator: **", `<@${message.author.id}>`);
        embed.setColor(0xFD413C);
        channel.send(embed);
        channel.send(`<@${message.author.id}>`).then(m => m.delete());
        message.delete();
    }
    else{
        let embed = new discord.MessageEmbed();
        embed.setTitle('Something went wrong...')
        embed.setColor(0xff0000);
        embed.setDescription('The command was not entered correctly');
        message.channel.send(embed);
        message.delete();
    }
}

function VerifyRuleInfractions(rules){
    rules.forEach(r => {if(isNaN(r.Infractions)){
        return false;
    }});
    return true;
}
