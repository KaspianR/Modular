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

            let GuildHTTP = new XMLHttpRequest();

            GuildHTTP.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    let obj = JSON.parse(this.responseText);
                
                    let element = document.getElementsByClassName('ContainerDiv')[0];

                    obj.forEach(g => {
                        if(g.active){
                            element.innerHTML += `<div class="ServerObject"><img class="ServerIcon" src=https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp?size=128><a class="ServerText">${g.name}</a><a href="/dashboard/${g.id}" class="ServerButton ActiveButton">Open settings</a></div>`;
                        }
                        else{
                            element.innerHTML += `<div class="ServerObject"><img class="ServerIcon" src=https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp?size=128><a class="ServerText">${g.name}</a><a href="https://discord.com/api/oauth2/authorize?client_id=705738969819906089&permissions=268511238&redirect_uri=http%3A%2F%2Flocalhost%2Flogin&scope=bot" class="ServerButton">Add bot</a></div>`;
                        }
                    });
                    
                    let loading = document.getElementsByClassName('LoadingDiv')[0];
                    loading.parentNode.removeChild(loading);
                }
            };

            GuildHTTP.open("GET", "/api/guilds", true);
            GuildHTTP.send();
        }
    }
};

UserHTTP.open("GET", "/api/user", true);
UserHTTP.send();