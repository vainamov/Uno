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
        this.options = "";
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

        player.socket.on("start", (mode, options) => this.startGame(mode, options));

        player.socket.on("draw-card", () => {
            if (this.drawStackCount === 0) {
                if (this.options.includes("keepdrawing")) {
                    this.drawUntil(player);
                } else {
                    this.draw(player);
                }
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
        let specialCards = ["skip", "reverse", "plus2"];
        let blackCards = ["wild", "plus4"];
        let magicCards = [];
        let numberLimit = 10;
        let multiplier = 1;
        let specialMultiplier = 1;

        if (this.mode === "morecolors") {
            colors.push("purple");
        }

        if (this.mode === "evenmorecolors") {
            colors.push("purple", "orange");
        }

        if (this.mode === "colorblind") {
            colors = ["gray"];
            multiplier = 5;
            specialMultiplier = 40;
        }

        if (this.options.includes("x2")) {
            specialCards.push("times2");
        }

        if (this.options.includes("+random")) {
            specialCards.push("plusrandom");
        }

        if (this.options.includes("nope")) {
            specialCards.push("nope");
        }

        if (this.options.includes("wildrandom")) {
            blackCards.push("wildrandom");
        }

        if (this.options.includes("succdragon")) {
            magicCards.push("succdragon");
        }

        if (this.options.includes("tornado")) {
            magicCards.push("tornado");
        }

        if (this.options.includes("hex")) {
            numberLimit = 16;
        }

        const numberCards = [...Array(numberLimit).keys()];

        this.deck = [];
        this.pile = [];
        this.players.forEach((p) => p.deck = []);
        
        colors.forEach((color) => {
            numberCards.forEach((number) => {
                if (number === 0) {
                    for (let i = 0; i < 1 * multiplier; i++) {
                        this.deck.push(new Card(color, number, "number"));
                    }
                } else {
                    for (let i = 0; i < 2 * multiplier; i++) {
                        this.deck.push(new Card(color, number, "number"));
                    }
                }
            });

            specialCards.forEach((special, index) => {
                for (let i = 0; i < 2 * specialMultiplier; i++) {
                    this.deck.push(new Card(color, 100 + index, special));
                }
            });
        });

        if (this.mode !== "colorblind") {
            blackCards.forEach((black, index) => {
                for (let i = 0; i < 4; i++) {
                    this.deck.push(new Card("black", 200 + index, black));
                }
            });
        }

        magicCards.forEach((magic, index) => {
            this.deck.push(new Card("magic", 300 + index, magic));
        });

        this.deck = this.shuffle(this.deck);
    }

    draw(player) {
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

        this.nextTurn();
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

        let updateDrawStackCount = false;
        let updateNextColor = false;

        switch (lastCard.type) {
            case "skip":
                this.nextTurn(2);
                return;
            case "reverse":
                this.reverse = !this.reverse;
                break;
            case "plus2":
                this.drawStackCount += 2;
                updateDrawStackCount = true;
                break;
            case "times2":
                if (this.drawStackCount === 0) {
                    this.drawStackCount = 2;
                } else {
                    this.drawStackCount *= 2;
                }

                updateDrawStackCount = true;
                break;
            case "plusrandom":
                //                                               (MAX - MIN + 1) + MIN
                this.drawStackCount += Math.floor(Math.random() * (10 - 1 + 1) + 1);
                updateDrawStackCount = true;
                break;
            case "nope":
                break;
            case "wild":
                updateNextColor = true;
                break;
            case "plus4":
                this.drawStackCount += 4;
                updateDrawStackCount = updateNextColor = true;
                break;
            case "wildrandom":
                updateNextColor = true;
                break;
            case "succdragon":
                break;
            case "tornado":
                break;              
            case "number":
            default:
                break;            
        }

        if (updateDrawStackCount) {
            this.players.forEach((p) => p.socket.emit("set-draw-stack-count", this.drawStackCount));
        }

        if (updateNextColor) {
            this.players.forEach((p) => p.socket.emit("set-forced-color", this.forcedColor));
        }

        this.nextTurn();
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

    playCard(player, card, selectedOption = "") {
        let playerCard = player.deck.find((c) => c.color === card.color && c.number === card.number && c.type === card.type);
       
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

        player.deck.splice(player.deck.indexOf(playerCard), 1);
        this.pile.push(playerCard);

        if (selectedOption.length > 0) {
            if (playerCard.type === "wild" || playerCard.type === "plus4" || playerCard.type === "wildrandom") {
                this.forcedColor = selectedOption;
            }

            if (this.options.includes("7-0") && playerCard.number === 7) {
                // Switch decks

                // TODO: Add Uno Check if given deck only has 1 card
                let switcher = this.players.find((p) => p.name === selectedOption);
                let deck = player.deck.slice(0);
                player.deck = switcher.deck.slice(0);
                switcher.deck = deck;

                player.socket.emit("set-deck", player.deck);
                switcher.socket.emit("set-deck", switcher.deck);
                
                this.players.forEach((p) => {
                    p.socket.emit("player-deck-count", player.name, player.deck.length);
                    p.socket.emit("player-deck-count", switcher.name, switcher.deck.length);                    
                });
            }
        }

        if (this.options.includes("7-0") && playerCard.number === 0) {
            // TODO: Implement 0
        }

        switch (playerCard.type) {
            case "succdragon":
                // TODO: Implement Succdragon
                break;
            case "tornado":
                // TODO: Implement Tornado
                break;
            default:
                break;
        }

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

    startGame(mode = "default", options = []) {
        this.turn = -1;
        this.reverse = false;
        this.drawStackCount = 0;
        this.forcedColor = "";
        this.unoPlayer = "";
        this.noUnoPlayer = "";

        this.mode = mode;
        this.options = options;

        this.createDeck();

        this.players.forEach((p) => {
            p.socket.emit("started", mode, options);
            this.drawCards(p, 7);
        });

        this.nextTurn();
    }

    stopGame(player) {
        // STOP GAME

        this.players.forEach((p) => p.socket.emit("stopped"));
    }

}