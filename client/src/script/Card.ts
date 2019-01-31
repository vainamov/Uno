export default class Card {
    public color: string;
    public number: number;
    public type: string;

    constructor(color: string, number: number, type: string) {
        this.color = color;
        this.number = number;
        this.type = type;
    }
}