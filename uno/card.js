module.exports = class Card {

    /* 
        0   : 1 of each color
        1-9 : 2 of each color = "number" 
        SKIP: 2 of each color = "skip"
        RV  : 2 of each color = "reverse"
        +2  : 2 of each color = "plus2"
        WILD: 4               = "wild"
        +4  : 4               = "plus4"


        7 cards per player
    */

    constructor(color, number, type) {
        this.color = color;
        this.number = number;
        this.type = type;
        this.data = {};
    }

    isPlayable(lastCard) {
        // Add check for draw stack count and forced color

        return true;

        // Add correct checks

        if (!lastCard || lastCard.color === "") {
            return true;
        }

        if (this.color === "black" || this.color === "magic") {
            return true;
        }

        return this.color === lastCard.color || (this.type === "number" && this.number === lastCard.number) || (this.type !== "number" && this.type === lastCard.type);
    }

}