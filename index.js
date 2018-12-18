const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const cors = require("cors");

app.use(cors());

const Game = require("./uno/game");
const Player = require("./uno/player");

let game = new Game();

io.on("connect", (socket) => {

    socket.on("join", (name) => {
        let player = new Player();
        player.name = name;
        player.socket = socket;

        if (game.players.some((p) => p.name === name)) {
            socket.emit("name-taken");
        } else {
            game.addPlayer(player);            
            socket.emit("joined");
            console.log(`Player "${name}" joined.`);
        }
    });

});

http.listen(80, () => console.log("Server started"));