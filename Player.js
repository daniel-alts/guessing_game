class Player {
    constructor({ name, isGameMaster = false, id }) {
        this.id = id || Math.floor(Math.random() * 10000);
        this.name = name;
        this.isGameMaster = isGameMaster;
        this.score = 0;
    }

    guessAnswer(question, guess) {
       return question.isAnswer(guess);
    }

    setGameMaster(bool) {
        this.isGameMaster = bool;
    }
}

module.exports = Player;
