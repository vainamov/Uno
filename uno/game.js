const Card = require("./card");

module.exports = class Game {

    constructor() {
        this.players = [];
        this.deck = [];
        this.pile = [];
        this.turn = -1;
        this.reverse = false;
        this.drawStackCount = 0;
        this.forcedColor = "";
        this.unoPlayer = "";
        this.noUnoPlayer = "";
        this.mode = "";
    }

    addPlayer(player) {
        player.game = this;
                
        this.players.forEach((p) => {
            p.socket.emit("new-player", player.name);
            player.socket.emit("new-player", p.name);
        });

        this.players.push(player);
        player.socket.emit("new-player", player.name);

        player.socket.on("disconnect", () => this.removePlayer(player));

        player.socket.on("start", (mode) => this.startGame(mode));

        player.socket.on("draw-card", () => {
            if (this.drawStackCount === 0) {
                this.drawUntil(player);
            } else {
                this.drawCards(player, this.drawStackCount);
            }
        });

        player.socket.on("play-card", (card, color = "") => this.playCard(player, card, color));

        player.socket.on("keep-card", () => this.nextTurn());

        player.socket.on("say-uno", () => {
            this.unoPlayer = player.name;

            this.players.forEach((p) => p.socket.emit("uno-said", player.name));
        });

        player.socket.on("no-uno", (player) => {
            if (player === this.noUnoPlayer) {
                this.noUnoPlayer = "";
                this.drawCards(this.players.find((p) => p.name === player), 2);
            }
        });
    }

    createDeck() {
        let colors = ["red", "blue", "yellow", "green"];

        if (this.mode === "morecolors") {
            colors.push("orange", "purple");
        }

        const numbers = [...Array(13).keys()];

        this.deck = [];
        this.pile = [];
        this.players.forEach((p) => p.deck = []);
        
        colors.forEach((color) => {
            numbers.forEach((number) => {
                if (number === 0) {
                    this.deck.push(new Card(color, number));
                } else {
                    this.deck.push(new Card(color, number));
                    this.deck.push(new Card(color, number));
                }
            });
        });

        for (let i = 0; i < 4; i++) {
            this.deck.push(new Card("black", 13));
            this.deck.push(new Card("black", 14));
        }

        this.deck = this.shuffle(this.deck);
    }

    drawCards(player, amount) {
        for (let i = 0; i < amount; i++) {
            let card = this.deck.pop();
            player.deck.push(card);

            player.socket.emit("card-drawn", card);
            this.players.forEach((p) => p.socket.emit("player-drew-card", player.name));

            if (this.deck.length === 0) {
                let lastCard = this.pile.pop();
                
                this.pile.forEach((c) => {
                    this.deck.push(c);
                });
                this.deck = this.shuffle(this.deck);

                this.pile = [];
                this.pile.push(lastCard);
            }
        }

        if (this.drawStackCount > 0) {
            this.drawStackCount = 0;
            this.players.forEach((p) => p.socket.emit("set-draw-stack-count", this.drawStackCount));
            this.nextTurn();
        }
    }

    drawUntil(player) {
        while (true) {
            let card = this.deck.pop();
            player.deck.push(card);
            
            player.socket.emit("card-drawn", card);
            this.players.forEach((p) => p.socket.emit("player-drew-card", player.name));

            if (this.deck.length === 0) {
                let lastCard = this.pile.pop();
                
                this.pile.forEach((c) => {
                    this.deck.push(c);
                });
                this.deck = this.shuffle(this.deck);

                this.pile = [];
                this.pile.push(lastCard);
            }
            
            if (card.isPlayable(this.pile[this.pile.length - 1]) || card.color === this.forcedColor) {
                this.players.forEach((p) => p.socket.emit("set-turn", this.turn));
                player.socket.emit("suitable-card", card);
                return;
            }
        }
    }

    nextRound() {
        let lastCard = this.pile[this.pile.length - 1];

        switch (lastCard.number) {
            case 10:
                // SKIP    
                this.nextTurn(2);
                break;
            case 11:
                // REVERSE
                this.reverse = !this.reverse;

                this.nextTurn();
                break;
            case 12:
                // +2
                this.drawStackCount += 2;

                this.players.forEach((p) => p.socket.emit("set-draw-stack-count", this.drawStackCount));
                this.nextTurn();
                break;
            case 13:
                // WILD
                //this.forcedColor = lastCard.color;

                this.players.forEach((p) => p.socket.emit("set-forced-color", this.forcedColor));
                this.nextTurn();
                break;
            case 14:
                // +4
                this.drawStackCount += 4;
                //this.forcedColor = lastCard.color;

                this.players.forEach((p) => {
                    p.socket.emit("set-draw-stack-count", this.drawStackCount);
                    p.socket.emit("set-forced-color", this.forcedColor);
                });
                this.nextTurn();
                break;
            default:
                this.nextTurn();
                break;
        }

    }

    nextTurn(turns = 1) {
        for (let n = 0; n < turns; n++) {
            if (this.reverse) {
                this.turn--;
            } else {
                this.turn++;
            }

            if (this.turn === this.players.length) {
                this.turn = 0;
            }

            if (this.turn === -1) {
                this.turn = this.players.length - 1;
            }
        }

        this.players.forEach((p) => p.socket.emit("set-turn", this.turn));
    }

    playCard(player, card, forcedColor = "") {
        let playerCard = player.deck.find((c) => c.color === card.color && c.number === card.number);
       
        if (!playerCard) {
            // Player does not have card
            return;
        }

        if (!playerCard.isPlayable(this.pile[this.pile.length - 1]) && playerCard.color !== this.forcedColor) {
            // Card is not playable
            return;
        }

        if (this.forcedColor.length > 0) {
            this.pile[this.pile.length - 1].color = "black";
            this.forcedColor = "";
            this.players.forEach((p) => p.socket.emit("set-forced-color", this.forcedColor));
        }

        if (forcedColor.length > 0) {
            this.forcedColor = forcedColor;
        }

        player.deck.splice(player.deck.indexOf(playerCard), 1);
        this.pile.push(playerCard);

        this.players.forEach((p) => p.socket.emit("card-played", player.name, playerCard));

        if (player.deck.length === 1 && player.name !== this.unoPlayer) {
            this.noUnoPlayer = player.name;
            this.players.filter((p) => p.name !== player.name).forEach((p) => p.socket.emit("uno-not-said", this.noUnoPlayer));

            setTimeout(() => {
                this.noUnoPlayer = "";
                this.players.filter((p) => p.name !== player.name).forEach((p) => p.socket.emit("uno-not-said", this.noUnoPlayer));
            }, 2000);
        } else {
            this.unoPlayer = "";
            this.players.forEach((p) => p.socket.emit("uno-said", ""));
        }

        if (player.deck.length === 0) {
            this.stopGame(player);
        } else {
            this.nextRound();
        }
    }

    removePlayer(player) {
        this.players.splice(this.players.indexOf(player), 1);

        this.players.forEach((p) => p.socket.emit("player-left", player.name));
    }

    shuffle(cards) {
        return cards.map((a) => [Math.random(), a]).sort((a, b) => a[0] - b[0]).map((a) => a[1]);
    }

    startGame(mode = "default") {
        this.turn = -1;
        this.reverse = false;
        this.drawStackCount = 0;
        this.forcedColor = "";
        this.unoPlayer = "";
        this.noUnoPlayer = "";

        this.mode = mode;

        this.createDeck();

        this.players.forEach((p) => {
            p.socket.emit("started", mode);
            this.drawCards(p, 7);
        });

        this.nextTurn();
    }

    stopGame(player) {
        // STOP GAME

        this.players.forEach((p) => p.socket.emit("stopped"));
    }

}