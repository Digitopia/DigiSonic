class Error {
    constructor(msg, line) {
        this.msg = msg
        this.line = line
        this.name = 'Error'
    }
}

export class InvalidMidi extends Error {
    constructor(msg, line) {
        super(msg, line)
        this.msg = 'a nota MIDI deve ser um número entre 48 e 84'
        this.name = 'InvalidMidi'
    }
}

export class InvalidNote extends Error {
    constructor(msg, line) {
        super(msg, line)
        this.msg = 'formato inválido de nota'
        this.name = 'InvalidNote'
    }
}

export class InvalidInstruction extends Error {
    constructor(msg, line) {
        super(msg, line)
        this.msg = 'a instrução terá de ser toca ou espera'
        this.name = 'InvalidInstruction'
    }
}
