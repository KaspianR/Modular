let RuleDiv = `<div class="RuleDiv"><input class="InputField TitleField" type="text" placeholder="Rule title"><input class="InputField InfractionsField" type="number" placeholder="Infractions"><textarea class="InputField BigInputField" type="text" placeholder="Rule description"></textarea><button class="RuleButton DuplicateButton" onclick="DuplicateRule(this)">Duplicate</button><button class="RuleButton DeleteButton" onclick="DeleteRule(this)">Delete</button></div>`;
let LastSettings;

let UserHTTP = new XMLHttpRequest();

UserHTTP.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        if(this.responseText == 'Not signed in'){
            window.location.replace("https://discord.com/api/oauth2/authorize?client_id=705738969819906089&redirect_uri=http%3A%2F%2Flocalhost%2Flogin&response_type=code&scope=identify%20guilds");
        }
        else{

            let obj = JSON.parse(this.responseText);
            document.getElementsByClassName('UserAvatar')[0].src = obj.url;
            document.getElementsByClassName('UserText')[0].text = obj.name;

            let SettingsHTTP = new XMLHttpRequest();

            SettingsHTTP.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    if(this.responseText == 'Not signed in'){
                        window.location.replace("https://discord.com/api/oauth2/authorize?client_id=705738969819906089&redirect_uri=http%3A%2F%2Flocalhost%2Flogin&response_type=code&scope=identify%20guilds");
                    }
                    else{
                        Deserialize(JSON.parse(this.responseText));
                        LastSettings = this.responseText;
            
                        let loading = document.getElementsByClassName('LoadingDiv')[0];
                        loading.parentNode.removeChild(loading);
                    }
                }
            };
            
            SettingsHTTP.open("GET", "/api/settings/get/" + window.location.pathname.split('/')[2], true);
            SettingsHTTP.send();
        }
    }
};

UserHTTP.open("GET", "/api/user", true);
UserHTTP.send();

function CheckChanges(){
    if(JSON.stringify(Serialize()) == LastSettings){
        DisableSave();
    }
    else{
        EnableSave();
    }
}

function SaveData(){
    let obj = Serialize();
    var SettingHTTP = new XMLHttpRequest();
    SettingHTTP.open("POST", '/api/settings/set/' + window.location.pathname.split('/')[2], true);
    SettingHTTP.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    SettingHTTP.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            if(this.responseText == 'Saved'){
                DisableSave();
            }
        }
    }
    SettingHTTP.send(JSON.stringify(obj));
    LastSettings = obj;
}

function Serialize(){
    let RuleElements = [...document.getElementsByClassName('RuleContainer')[0].childNodes];
    RuleElements = RuleElements.filter(e => e.nodeName == 'DIV');
    let rules = [];
    RuleElements.forEach(r => {rules.push({Title: r.childNodes[0].value, Infractions: r.childNodes[1].value, Description: r.childNodes[2].value})});
    let obj = {
        CommandPrefix: document.getElementById('CommandPrefix').value,
        PublicLogID: document.getElementById('PublicLogID').value,
        KickAfterInfractions: document.getElementById('KickAfterInfractions').value,
        BanAfterInfractions: document.getElementById('BanAfterInfractions').value,
        Rules: rules,
        SendRulesInDifferentMessages: document.getElementById('SendRulesInDifferentMessages').checked,
        RuleColor: document.getElementById('RuleColor').value
    };
    return obj;
}

function Deserialize(obj){
    document.getElementById('CommandPrefix').value = obj.CommandPrefix;
    document.getElementById('PublicLogID').value = obj.PublicLogID;
    document.getElementById('KickAfterInfractions').value = obj.KickAfterInfractions;
    document.getElementById('BanAfterInfractions').value = obj.BanAfterInfractions;
    let container = document.getElementsByClassName("RuleContainer")[0];
    for(let i = obj.Rules.length - 1; i >= 0; i--){
        container.insertAdjacentHTML('afterbegin', RuleDiv);
        container.firstChild.childNodes[0].value = obj.Rules[i].Title;
        container.firstChild.childNodes[1].value = obj.Rules[i].Infractions;
        container.firstChild.childNodes[2].value = obj.Rules[i].Description;
    }
    document.getElementById('SendRulesInDifferentMessages').checked = obj.SendRulesInDifferentMessages;
    document.getElementById('RuleColor').value = obj.RuleColor;
}

function AddNewRule(){
    document.getElementsByClassName("AddButton")[0].insertAdjacentHTML('beforebegin', RuleDiv);
}

function DuplicateRule(e){
    let element = e.parentElement.cloneNode(true);
    e.parentNode.parentNode.insertBefore(element, e.parentNode);
}

function DeleteRule(e){
    e.parentElement.remove();
}

function EnableSave(){
    document.getElementsByClassName('SavePromptDiv')[0].classList.add('NeedToSave');
}

function DisableSave(){
    document.getElementsByClassName('SavePromptDiv')[0].classList.remove('NeedToSave');
}
