let UserHTTP = new XMLHttpRequest();

UserHTTP.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        if(this.responseText == 'Not signed in'){
            document.getElementsByClassName('UserDiv')[0].style.display = 'none';
            document.getElementsByClassName('LoginButton')[0].style = '';
        }
        else{
            let obj = JSON.parse(this.responseText);
            document.getElementsByClassName('UserAvatar')[0].src = obj.url;
            document.getElementsByClassName('UserText')[0].text = obj.name;
        }
        let loading = document.getElementsByClassName('LoadingDiv')[0];
        loading.parentNode.removeChild(loading);
    }
};

UserHTTP.open("GET", "/api/user", true);
UserHTTP.send();
