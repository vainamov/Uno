module.exports = class Card {

    /* 
        0   : 1 of each color
        1-9 : 2 of each color
        SKIP: 2 of each color = 10
        RT  : 2 of each color = 11
        +2  : 2 of each color = 12
        WILD: 4               = 13
        +4  : 4               = 14

        7 cards per player
    */

    constructor(color, number) {
        this.color = color;
        this.number = number;
    }

    isPlayable(lastCard) {

        // Add check for draw stack count and forced color

        if (!lastCard || lastCard.color === "") {
            return true;
        }

        if (this.color === "black") {
            return true;
        }

        return this.color === lastCard.color || this.number === lastCard.number;
    }

}