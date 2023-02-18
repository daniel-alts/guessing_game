const Timer = require('./Timer');
const Player = require('./Player');
const Question = require('./Question');

const GAME_STATES = {
    IN_PROGRESS: 'in_progress',
    WAITING: 'waiting'
}

class GameSessionEvent {
    constructor({ data, eventName, message } ) {
        this.data = data;
        this.eventName = eventName;
        this.message = message;
    }
}

class GameSession {
    constructor({ io }) {
        this.players = [];
        this.question = null;
        this.events = [];
        this.timer = new Timer({ gameSession: this })
        this.state = GAME_STATES.WAITING;
        this.gameMaster = null;
        this.socket = io;
        this.playersIndex = {}
    }

    createGameEvent({ message, data, eventName }) {
        const event = new GameSessionEvent({ message, data, eventName })
        this.events.push(event);
        return event;
    }

    emitEvent(event) {
        this.socket.emit(event.eventName, event);
    }

    emitGameEvent({ message, data, eventName }) {
        const event = this.createGameEvent({ message, data, eventName });
        this.emitEvent(event)
    }


    createQuestion({ event }) {

        if (this.state === GAME_STATES.IN_PROGRESS) return;
    
        const question = new Question({ question: event.question, answer: event.answer });
        this.question = question;

        this.emitGameEvent({
            message: `QUESTION: ${this.question.question}`,
            eventName: 'question_created',
        })

        this.state = GAME_STATES.IN_PROGRESS;
        this.timer.start();
    
        this.timer.onTimeExpired((gameSession) => {
            gameSession.emitGameEvent({
                message: `TIMER: game session has expired, The answer to the question is ${this.question.answer}`,
                eventName: 'time_expired',
            })
            gameSession.state = GAME_STATES.WAITING;
            gameSession.assignGameMaster()
        })
    }

    emitScores() {
        let scores = ''
        for (const player of this.players) {
            scores += `${player.name}: ${player.score},\n`
        }

        this.emitGameEvent({
            message: `SCOREBOARD:\n ${scores}`,
            eventName: 'general_message',
        })
    }

    assignGameMaster(retry = false) {
        if (!retry) {
            this.emitScores();
        }
    
        // reset game master
        for(const player of this.players) {
            if (player.isGameMaster) {
                player.setGameMaster(false);
                break;
            }
        };
        this.gameMaster = null;


        const randomIndex = Math.floor(Math.random() * this.players.length)
        let newGameMaster = this.players[randomIndex];

        if (!newGameMaster) {
            this.assignGameMaster(retry);
        }

        newGameMaster.setGameMaster(true)

        this.gameMaster = newGameMaster;

        this.emitGameEvent({
            message: `NEW GAME MASTER: New game master is ${this.gameMaster.name}`,
            eventName: 'new_game_master',
            data: this.players,
        })
    }

    guessAnswer({ event, socket }) {

        if (this.state === GAME_STATES.WAITING) return;

        const isAnswer = this.question.isAnswer(event.answer);

        const player = this.playersIndex[socket.id];

        if (!isAnswer) {
            this.emitGameEvent({
                message: `GUESS: ${player.name} guessed ${event.answer}`,
                eventName: 'guess',
                isAnswer
            })
        } else {
            this.emitGameEvent({
                message: `ANSWER: The answer is ${event.answer}. 10 points awarded to ${player.name}`,
                eventName: 'guess',
                isAnswer
            })
            player.score += 10;
            this.timer.stop();
            this.state = GAME_STATES.WAITING;
            this.assignGameMaster();
        }    
    }
 
    join({event, socket }) {

        if (this.state === GAME_STATES.IN_PROGRESS) {
            this.emitGameEvent({ 
                message: `Game is in progress, try again in ${this.timer.secondsLeft()} seconds`,
                eventName: 'join_error'
            })
        }

        if (!event.data.name || !event.data.name.trim().length) {
            this.emitGameEvent({ 
                message: `Must provide a name`,
                eventName: 'join_error'
            })
        }

        if (this.state === GAME_STATES.WAITING) {
            const player = new Player({ name: event.data.name, id: socket.id });
            this.playersIndex[socket.id] = player;
    
            if (!this.gameMaster) {
                player.setGameMaster(true)
                this.gameMaster = player;
            }

            this.players.push(player);
            this.emitGameEvent({ 
                message: `${player.name} just joined`,
                data: {
                    player,
                    gameMaster: this.gameMaster
                }, 
                eventName: 'player_joined'
            })
        }
    }

    exit({ socket }) {
        this.players = this.players.filter((pl) => pl.id !== socket.id)
    }
}

module.exports = GameSession;