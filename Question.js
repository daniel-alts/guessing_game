class Question {
    constructor({ question, answer }) {
        this.question = question;
        this.answer = answer.trim();
    }

    isAnswer(guess) {
        return this.answer.toLowerCase() === guess.trim().toLowerCase();
    }
}

module.exports = Question;
