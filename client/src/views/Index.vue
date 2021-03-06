<script lang="ts">

    import { Component, Vue } from "vue-property-decorator";

    import io from "socket.io-client";

    import Card from "@/script/Card";

    @Component({})
    export default class Index extends Vue {

        cardPlayed: boolean = false;
        cardToPlay: Card = new Card("", -1, "");
        drawStackCount: number = 0;
        force2or4: boolean = false;
        forceColor: boolean = false;
        forcedColor: string = "";
        hand: Card[] = [];
        joined: boolean = false;
        lastCard: Card = new Card("", -1, "");
        nameTaken: boolean = false;
        isPlayerPick: boolean = false;
        players: {name: string, cards: number}[] = [];
        possibleColors: string[] = ["red", "blue", "yellow", "green"];
        selectedMode: string = "";
        selectedOptions: string[] = [];
        serverAddress: string = `${window.location.hostname}:8081`;
        serverAvailable: boolean = false;
        showKeepCard: boolean = false;
        showPicker: boolean = false;
        socket: any;
        started: boolean = false;
        turn: number = 0;
        unoSaid: boolean = false;
        unoNPlayer: string = "";
        unoPlayer: string = "";
        username: string = "";

        addAllOptions(event: MouseEvent): void {
            (document.getElementById("optionsInput") as HTMLInputElement).value = ((event.target as HTMLElement).getAttribute("aria-label") + "").replace(/ /g, "");
        }

        connect(): void {
            this.serverAvailable = false;

            let socket = io("http://" + this.serverAddress);

            socket.on("connect", () => {
                this.serverAvailable = true;
            });

            socket.on("disconnect", () => {
                this.cardPlayed = this.force2or4 = this.forceColor = this.joined = this.nameTaken = this.serverAvailable = this.showKeepCard = this.showPicker = this.started = this.unoSaid = false;
                this.cardToPlay = new Card("", -1, "");
                this.drawStackCount = 0;
                this.forcedColor = "";
                this.hand = [];
                this.lastCard = new Card("", -1, "");
                this.players = [];
                this.turn = 0;
                this.unoNPlayer = this.unoPlayer = "";
            });

            socket.on("name-taken", () => {
                this.nameTaken = true;
            });

            socket.on("joined", () => {
                this.joined = true;
                this.nameTaken = false;
            });

            socket.on("new-player", (player: string) => {
                this.players.push({ name: player, cards: 0 });
            });

            socket.on("player-left", (player: string) => {
                this.players.splice(this.players.indexOf(this.players.find((p) => p.name === player) as { name: string, cards: number }), 1);
            });

            socket.on("started", (mode: string, options: string[]) => {
                this.started = true;
                this.selectedMode = mode;
                this.selectedOptions = options;                

                if (this.selectedMode === "morecolors") {
                    this.possibleColors.push("purple");
                }

                if (this.selectedMode === "evenmorecolors") {
                    this.possibleColors.push("purple");
                    this.possibleColors.push("orange");
                }

                if (this.selectedMode === "colorblind") {
                    this.possibleColors = ["gray"];
                }
            });

            socket.on("stopped", () => {
                this.cardPlayed = this.force2or4 = this.forceColor = this.showKeepCard = this.showPicker = this.started = this.unoSaid = false;
                this.cardToPlay = new Card("", -1, "");
                this.drawStackCount = 0;
                this.forcedColor = "";
                this.hand = [];
				this.players.forEach(p => p.cards = 0);
                this.lastCard = new Card("", -1, "");
                this.turn = 0;
                this.unoNPlayer = this.unoPlayer = "";
            });

            socket.on("card-drawn", (card: Card) => {
                this.hand.push(card);
            })

            socket.on("set-deck", (deck: Card[]) => {
                this.hand = deck;
            });

            socket.on("suitable-card", (card: Card) => {
                this.showKeepCard = true;
            });

            socket.on("player-drew-card", (player: string) => {
                (this.players.find((p) => p.name === player) as { name: string, cards: number }).cards++;
            });

            socket.on("player-deck-count", (player: string, count: number) => {
                (this.players.find((p) => p.name === player) as { name: string, cards: number }).cards = count;
            });

            socket.on("set-turn", (turn: number) => {
                this.turn = turn;
                this.cardPlayed = false;

                if (this.username === this.players[this.turn].name) {
                    if (this.drawStackCount > 0) {
                        this.force2or4 = true;
                    }

                    if (this.forcedColor.length > 0) {
                        this.forceColor = true;
                    }
                }
            });

            socket.on("card-played", (player: string, card: Card) => {
                if (this.username === player) {
                    this.hand.splice(this.hand.findIndex((c) => c.color === card.color && c.number === card.number), 1);
                }

                this.lastCard = card;

                (this.players.find((p) => p.name === player) as { name: string, cards: number }).cards--;
            });

            socket.on("set-draw-stack-count", (count: number) => {
                this.drawStackCount = count;

                if (this.drawStackCount === 0) {
                    this.force2or4 = false;
                }
            });

            socket.on("set-forced-color", (color: string) => {
                this.forcedColor = color;

                if (this.forcedColor.length > 0) {
                    this.lastCard.color = color;
                } else {
                    this.forceColor = false;
                }
            });

            socket.on("uno-said", (player: string) => {
                this.unoPlayer = player;
            });

            socket.on("uno-not-said", (player: string) => {
                this.unoNPlayer = player;
            });

            this.socket = socket;
        }

        draw(): void {
            if (this.username !== this.players[this.turn].name || this.cardPlayed || this.showKeepCard || this.showPicker) {
                return;
            }

            this.cardPlayed = true;
            (this.socket as SocketIOClient.Socket).emit("draw-card");
        }

        getCardText(number: number, type: string): string {
            switch (type) {
                case "number":
                    if (this.selectedOptions.includes("hex")) {
                        switch (number) {
                            case 10:
                                return "A";
                            case 11:
                                return "B";
                            case 12:
                                return "C";
                            case 13:
                                return "D";
                            case 14:
                                return "E";
                            case 15:
                                return "F";
                        }
                    }
                    
                    return `${number}`;
                case "skip":
                    return "Skip";
                case "reverse":
                    return "Reverse";
                case "plus2":
                    return "+2";
                case "times2":
                    return "×2";
                case "plusrandom":
                    return "+?";
                case "nope":
                    return "Nope";
                case "wild":
                    return "Wild";
                case "plus4":
                    return "+4";
                case "wildrandom":
                    return "Wild ?";
                case "succdragon":
                    return "Succdragon";
                case "tornado":
                    return "Tornado";
                default:
                    return type;
            }
            
        }

        isCardPlayable(card: Card): boolean {
            if (this.cardPlayed) {
                return false;
            }

            if (this.players[this.turn].name !== this.username) {
                return false;
            }

            if (this.forceColor && card.color !== "black" && card.color !== "magic" && card.color !== this.forcedColor) {
                return false;
            }

            if (this.force2or4 && this.lastCard.type === "plus4" && card.type !== "plus4") {
                return false;
            }

            if (this.force2or4 && this.lastCard.type !== "plus4" && card.type !== "plus2" && card.type !== "times2" && card.type !== "plusrandom" && card.type !== "nope") {
                return false;
            }

            if (this.force2or4 && this.lastCard.type !== "plus4" && (card.type === "plus2" || card.type === "times2" || card.type === "plusrandom" || card.type === "nope")) {
                return true;
            }

            if (this.lastCard.color === "") {
                return true;
            }

            if (card.color === "black" || card.color === "magic") {
                return true;
            }

            return card.color === this.lastCard.color || (card.type === "number" && card.number === this.lastCard.number) || (card.type !== "number" && card.type === this.lastCard.type);
        }

        join(): void {
            (this.socket as SocketIOClient.Socket).emit("join", this.username);
        }

        keepCard(): void {
            this.showKeepCard = false;
            (this.socket as SocketIOClient.Socket).emit("keep-card");
        }

        mounted(): void {
            this.connect();
        }

        noUno(player: string): void {
            (this.socket as SocketIOClient.Socket).emit("no-uno", player);
        }

        setPickedChoice(color: string): void {
            this.showPicker = false;

            this.unoSaid = false;
            (this.socket as SocketIOClient.Socket).emit("play-card", this.cardToPlay, color);

            this.cardToPlay = new Card("", -1, "");
        }

        playCard(card: Card): void {
            if (this.username !== this.players[this.turn].name || !this.isCardPlayable(card)) {
                return;
            }

            this.cardPlayed = true;
            this.showKeepCard = false;

            if (card.color === "black" && card.type !== "wildrandom") {
                this.cardToPlay = card;
                this.isPlayerPick = false;
                this.showPicker = true;
            } else if (card.type === "wildrandom") {
                (this.socket as SocketIOClient.Socket).emit("play-card", card, this.possibleColors[Math.random() * this.possibleColors.length | 0]);
            } else if (this.selectedOptions.includes("7-0") && card.number === 7) {
                this.cardToPlay = card;
                this.isPlayerPick = true;
                this.showPicker = true;
            } else {
                this.unoSaid = false;
                (this.socket as SocketIOClient.Socket).emit("play-card", card);
            }
        }

        sayUno(): void {
            this.unoSaid = true;

            (this.socket as SocketIOClient.Socket).emit("say-uno");
        }

        sortedHand(): Card[] {
            let colors: string[] = ["red", "blue", "yellow", "green"];

            if (this.selectedMode === "morecolors") {
                colors.push("purple");
            }

            if (this.selectedMode === "evenmorecolors") {
                colors.push("purple");
                colors.push("orange");
            }

            if (this.selectedMode === "colorblind") {
                colors = ["gray"];
            }

            colors.push("black");
            colors.push("magic");

            return this.hand.sort((a, b): number => {
                let cai = colors.indexOf(a.color);
                let cbi = colors.indexOf(b.color);

                if (cai < cbi) {
                    return -1;
                } else if (cai > cbi) {
                    return 1;
                } else {
                    if (a.number < b.number) {
                        return -1;
                    } else if (a.number > b.number) {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            });
        }

        startGame(mode: string = "", options: string[] = []): void {
            options = (document.getElementById("optionsInput") as HTMLInputElement).value.toLowerCase().split(",");            

            (this.socket as SocketIOClient.Socket).emit("start", mode, options);
        }

    }

</script>

<template>
    <div class="index">

        <div v-if="!this.joined" class="join-wrapper">
            <div class="Box Box--spacious mx-auto" style="width: 400px">
                <form>
                    <div class="Box-body">
                        <!-- <h3 class="f1-light text-center">UNO</h3> -->
                        <div class="text-center mb-4">
                            <img src="../assets/uno.svg" height="100" />
                        </div>
                        
                        <dl class="form-group mb-4">
                            <dt><label>Serveradresse</label></dt>
                            <dd><input class="form-control" type="text" v-model="serverAddress"></dd>
                        </dl>

                        <dl :class="['form-group mb-4', { 'errored': nameTaken }]">
                            <dt><label>Benutzername</label></dt>
                            <dd><input class="form-control" type="text" v-model="username" :disabled="!this.serverAvailable"></dd>
                            <dd v-if="this.nameTaken" class="error">Dieser Benutzername ist bereits vergeben.</dd>
                        </dl>
                        
                        <button @click.prevent="join()" class="btn btn-danger btn-block" :disabled="this.username.length == 0">Spiel beitreten</button>
                    </div>
                </form>
            </div>
        </div>

        <section v-if="this.joined" class="game-wrapper">

            <nav class="navigation box-shadow-medium mb-4 px-4">
                <h3 class="h3">UNO</h3>

                <div>
                    <button @click="addAllOptions($event)" class="btn btn-sm tooltipped tooltipped-s mr-2" type="button" aria-label="+random, 7-0, hex, keepdrawing, nope, succdragon, tornado, wildrandom, x2">Verfügbare Optionen</button>

                    <input id="optionsInput" class="form-control input-sm mr-2" type="text" placeholder="Optionen (1,2,3,4,...)">

                    <select class="form-select select-sm mr-2" v-model="selectedMode" :disabled="this.started">
                        <option value="">Spielvariante wählen</option>
                        <option value="standard">Standard</option>
                        <option value="morecolors">Mehr Farben</option>
                        <option value="evenmorecolors">Noch mehr Farben</option>
                        <option value="colorblind">Farbenblind</option>
                    </select>

                    <button @click="startGame(selectedMode)" class="btn btn-sm btn-primary" :disabled="this.started || this.selectedMode.length === 0">Spiel starten</button>
                </div>
            </nav>

            <section class="dashboard pb-4 px-4">
                <div style="height: 100%; width: 300px">
                    <nav class="menu mb-4">
                        <span class="menu-heading">Spieler</span>
                        <span v-for="player in players" class="menu-item" :key="player.name">{{ player.name }}</span>
                    </nav>

                    <nav class="menu">
                        <span class="menu-heading">Debug</span>
                    </nav>
                </div>

                <div class="pile">
                    <h1 v-if="this.drawStackCount > 0" class="h3 mb-2">Stack: +{{ this.drawStackCount }}</h1>

                    <div style="height: 100%">
                        <article v-if="lastCard.number > -1" :class="['card box-shadow-large last h4', lastCard.color]" :key="'lastCard'">
                            <div v-if="lastCard.type === 'number' || lastCard.type === 'plus2' || lastCard.type === 'plusrandom' || lastCard.type === 'times2'" :class="['inner', { 'small': lastCard.type !== 'number' }]" :data-number="getCardText(lastCard.number, lastCard.type)">{{ getCardText(lastCard.number, lastCard.type) }}</div>
                            <div class="p-2" v-else>{{ getCardText(lastCard.number, lastCard.type) }}</div>
                        </article>
                    </div>

                    <div v-if="this.showPicker && !this.isPlayerPick">
                        <div class="BtnGroup mt-2">
                            <button @click="setPickedChoice('red')" class="btn BtnGroup-item bg-red text-white" style="background-image: none !important">Rot</button>
                            <button @click="setPickedChoice('blue')" class="btn BtnGroup-item bg-blue text-white" style="background-image: none !important">Blau</button>
                            <button @click="setPickedChoice('yellow')" class="btn BtnGroup-item bg-yellow" style="background-image: none !important">Gelb</button>
                            <button @click="setPickedChoice('green')" class="btn BtnGroup-item bg-green text-white" style="background-image: none !important">Grün</button>
                            
                            <template v-if="this.selectedMode === 'morecolors'">
                                <button @click="setPickedChoice('purple')" class="btn BtnGroup-item bg-purple text-white" style="background-image: none !important">Lila</button>
                            </template>

                            <template v-if="this.selectedMode === 'evenmorecolors'">
                                <button @click="setPickedChoice('purple')" class="btn BtnGroup-item bg-purple text-white" style="background-image: none !important">Lila</button>
                                <button @click="setPickedChoice('orange')" class="btn BtnGroup-item bg-orange text-white" style="background-image: none !important">Orange</button>
                            </template>
                        </div>
                    </div>

                    <div v-if="this.showPicker && this.isPlayerPick">
                        <div class="BtnGroup mt-2">
                            <button v-for="player in players.filter(p => p.name !== this.username)" @click="setPickedChoice(player.name)" class="btn BtnGroup-item" style="background-image: none !important" :key="'pick-' + player.name">{{ player.name }}</button>
                        </div>
                    </div>
                </div>

                <div v-if="this.started" style="height: 100%; width: 300px">

                    <template v-for="player in players">

                        <div :class="['Box mb-2 p-2', { 'current-player': player.name === players[turn].name, 'uno-said': player.name === unoPlayer }]" :key="player.name">
                            <div class="d-flex flex-items-center flex-justify-between">
                                <p class="f3 m-0">{{ player.name }}</p>
                                <p class="ml-2 m-0">{{ player.cards }} Karten</p>
                            </div>
                            <div class="d-flex">
                                <article v-for="n in player.cards" class="card mini mt-1" :key="player.name + '-minicard-' + n"></article>
                            </div>
                            <div v-if="player.name === unoPlayer" class="mt-2">
                                <h5 class="h5 text-red">UNO!</h5>
                            </div>
                            <div v-if="player.name == unoNPlayer" class="mt-2">
                                <button @click="noUno(player.name)" class="btn btn-danger btn-block">Da fehlt ein UNO, bitch!</button>
                            </div>
                        </div>

                    </template>

                </div>
            </section>

        </section>        

        <section v-if="this.started" :class="['action pb-4 px-4', { 'sunken': username !== players[turn].name || showPicker}]">

            <div class="action-item">
                <article @click="draw()" :class="['card box-shadow-large deck h4 p-2', { 'playable': username === players[turn].name && !cardPlayed && !showKeepCard }]">Vom Stapel nehmen</article>
                <article v-if="this.showKeepCard" @click="keepCard()" class="card box-shadow-large keep h4 p-2 playable">Karte behalten</article>
            </div>

            <div class="action-item">
                <div class="hand">
                    <article v-for="(card, index) in sortedHand()" @click="playCard(card)" :class="['card box-shadow-large h4', card.color, { 'playable': isCardPlayable(card) }]" :key="'card-' + index">
                        <div v-if="card.type === 'number' || card.type === 'plus2' || card.type === 'plusrandom' || card.type === 'times2'" :class="['inner', { 'small': card.type !== 'number' }]" :data-number="getCardText(card.number, card.type)">{{ getCardText(card.number, card.type) }}</div>

                        <div class="p-2" v-else>{{ getCardText(card.number, card.type) }}</div>
                    </article>
                </div>
            </div>

            <div class="action-item">
                <article v-if="!this.unoSaid && this.hand.length === 2 && (this.isCardPlayable(this.hand[0]) || this.isCardPlayable(this.hand[1]))" @click="sayUno()" class="card box-shadow-large keep h4 p-2 playable d-flex flex-items-center flex-justify-center tooltipped tooltipped-n tooltipped-no-delay" style="margin-left: auto" aria-label="UNO letzte Karte, bitches!"><img src="../assets/uno.svg" height="100" /></article>
            </div>

        </section>

    </div>
</template>

<style lang="scss" scoped>

    @import url("https://fonts.googleapis.com/css?family=Source+Sans+Pro:900");

    .index {
        height: 100vh;
        max-height: 100vh;
        overflow-y: hidden;
    }

    .join-wrapper {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 100%;
    }

    .game-wrapper {
        height: calc(100vh - 300px);
    }

    .navigation {
        align-items: center;
        display: flex;
        height: 48px;
        justify-content: space-between;
    }

    .dashboard {
        display: flex;
        height: calc(100% - 72px);
        justify-content: space-between;
        width: 100%;
    }

    .pile {
        align-items: center;
        align-self: center;
        display: flex;
        flex-direction: column;
        height: 300px;
    }

    .bg-orange {
        background-color: #F66A0A;
    }

    .current-player {
        background-color: #FFD1AC;
    }

    .uno-said {
        background-color: #FDAEB7;
    }

    .action {
        display: flex;
        height: 300px;
        transform: none;
        transition: transform .75s cubic-bezier(.19, 1, .22, 1);

        &.sunken {
            transform: translateY(50%);
        }
    }

    .action-item {
        display: flex;
        flex: 1;
        justify-content: center;
    }

    .hand {
        display: flex;
        justify-content: center;
        max-width: calc(100vw - 488px);
        width: calc(100vw - 488px);
        z-index: 99999;
    }

    .card {
        border: 4px solid #FFF;
        border-radius: 8px;
        color: #FFF;
        height: 100%;
        position: relative;
        transition: all .2s ease;
        width: 180px;

        &:not(.deck):not(.mini):not(:last-of-type):hover {
            margin-right: 100px;
        }

        & + & {
            margin-left: -100px;
        }

        &.red {
            background-color: #D73A49;

            .inner {
                color: #D73A49;
            }
        }

        &.blue {
            background-color: #0366D6;

            .inner {
                color: #0366D6;
            }
        }

        &.yellow {
            background-color: #FFD33D;
            color: #24292E;

            .inner {
                color: #FFD33D;
            }
        }

        &.green {
            background-color: #28A745;

            .inner {
                color: #28A745;
            }
        }

        &.orange {
            background-color: #F66A0A;

            .inner {
                color: #F66A0A;
            }
        }

        &.purple {
            background-color: #6F42C1;

            .inner {
                color: #6F42C1;
            }
        }

        &.gray {
            background-color: #999;

            .inner {
                color: #999;
            }
        }

        &.magic {
            background-color: #A306B8;

            .inner {
                color: #A306B8;
            }
        }

        &.black {
            background-color: #24292E;

            .inner {
                color: #24292E;
            }
        }

        &.mini {
            background-color: #1B1F23;
            border: 2px solid #FFF;
            border-radius: 6px;
            cursor: default;
            height: 50px;
            width: 35px;

            & + & {
                margin-left: -17.5px;
            }
        }

        &.last {
            height: 276px !important;
        }

        &.deck {
            background-color: #1B1F23;
            margin-right: auto;
        }

        &.keep {
            background-color: #1B1F23;
        }

        .action &:not(.playable)::after {
            background-color: #FFFFFF80;
            content: "";
            display: block;
            height: 100%;
            left: 0;
            position: absolute;
            top: 0;
            width: 100%;
        }

        &.playable {
            cursor: pointer;
        }

        &.playable:hover {            
            transform: translateY(-16px) !important;
        }

        .inner {
            background-color: #FFF;
            border-radius: 120px 60px / 140px 60px;
            font-family: "Source Sans Pro", Arial;
            font-size: 150px;
            height: calc(100% - 32px);
            line-height: 230px;
            margin-top: 16px;
            padding: 0 26px;
            position: relative;
            text-align: center;
            text-shadow:
                1px  1px 0 #000000,
                -1px -1px 0 #000000,
                -1px  1px 0 #000000,
                1px -1px 0 #000000,
                1px  0   0 #000000,
                -1px  0   0 #000000,
                0   -1px 0 #000000,
                0    1px 0 #000000,
                4px  4px 0 #000000;

            &::after,
            &::before {
                color: #FFF;
                content: attr(data-number);
                display: block;
                font-size: 26px;
                position: absolute;
                text-shadow:
                    1px  1px 0 #000000,
                    -1px -1px 0 #000000,
                    -1px  1px 0 #000000,
                    1px -1px 0 #000000,
                    1px  0   0 #000000,
                    -1px  0   0 #000000,
                    0   -1px 0 #000000,
                    0    1px 0 #000000,
                    2px  2px 0 #000000;
            }

            &::after {
                bottom: -116px;
                right: 8px;
                transform: rotate(180deg);
            }

            &::before {
                left: 8px;
                top: -116px;
            }

            &.small {
                font-size: 100px;
            }
        }
    }

</style>
