const DEFAULT_TIMER = 60;

class Timer {
    constructor({ gameSession}) {
        this.seconds = 0;
        this.intervalId = null
        this._onTimeExpired = () => null
        this.gameSession = gameSession;
    }

    start() {
        this.intervalId = setInterval(() => {
            this.seconds += 1;

            this.gameSession.emitGameEvent({
                message: this.secondsLeft(),
                eventName: 'time',
            })

            if (this.seconds >= DEFAULT_TIMER) {
                this.stop();
                this._onTimeExpired(this.gameSession);
            }
        }, 1000)
    }

    stop() {
        this.seconds = 0;
        clearInterval(this.intervalId);
    }

    secondsLeft() {
        return DEFAULT_TIMER - this.seconds;
    }

    onTimeExpired(fn) {
        this._onTimeExpired = fn
    }
}

module.exports = Timer
