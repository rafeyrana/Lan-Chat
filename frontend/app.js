const API = "http://localhost:3001";
const messagesDiv = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("msg-input");

function append(msg){
    const p = document.createElement("div");
    p.className = "msg";
    p.textContent = msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function refresh(){
    try{
        const res = await fetch(`${API}/messages`);
        const data = await res.json();
        messagesDiv.innerHTML = "";
        data.forEach(append);
    }catch(e){
        console.error(e);
    }
}

setInterval(refresh, 2000);
refresh();

form.addEventListener("submit", async e=>{
    e.preventDefault();
    const msg = input.value.trim();
    if(!msg) return;
    input.value = "";
    append(`[You] ${msg}`);
    try{
        await fetch(`${API}/send`,{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({message:msg})
        });
    }catch(err){
        console.error(err);
    }
}); 