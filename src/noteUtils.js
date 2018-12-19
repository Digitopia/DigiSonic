import teoria from 'teoria'
import Tone from 'tone'

export default {
    /**
     * Parses the note and returns it "scientific" (C3) format.
     * @example parseNote("C3") => "C3"
     * @example parseNote("C") => "C3"
     * @example parseNote("60") => "C3"
     * @example parseNote("62") => "D3"
     * @example parseNote("63") => "Eb"
     * @example parseNote("61") => "C#"
     * @param {string} param the note to be parsed, probably in PT format (do3),
     * but also accepts scientific format (C3).
     */
    parseNote(notePtMidi) {
        /* eslint-disable brace-style, no-param-reassign, no-restricted-globals */

        let ret

        // is midi
        if (!isNaN(notePtMidi)) {
            ret = this.convertMidiToEnNote(notePtMidi, true)
        }

        // is do, re, mi, ...
        else {
            // if last char is not a number, then add '3' to the end
            if (isNaN(notePtMidi.slice(-1))) notePtMidi = `${notePtMidi}3`

            ret = this.convertPtNoteToEn(notePtMidi)
        }

        return ret

        /* eslint-enable no-restricted-globals */
        /* eslint-enable brace-style no-param-reassign */
    },

    /**
     * @TODO
     */
    convertPtNoteToEn(note, changeOctave = false) {
        note = note.toLowerCase()
        if (note.includes('do')) note = note.replace('do', 'C')
        else if (note.includes('re')) note = note.replace('re', 'D')
        else if (note.includes('mi')) note = note.replace('mi', 'E')
        else if (note.includes('fa')) note = note.replace('fa', 'F')
        else if (note.includes('sol')) note = note.replace('sol', 'G')
        else if (note.includes('la')) note = note.replace('la', 'A')
        else if (note.includes('si')) note = note.replace('si', 'B')
        if (changeOctave)
            note = teoria
                .note(note)
                .interval('P8')
                .scientific()
        return note
    },

    /**
     * @TODO
     */
    convertEnNoteToPt(note, changeOctave = false) {
        if (changeOctave)
            note = teoria
                .note(note)
                .interval('P-8')
                .scientific()
        note = note.toUpperCase()
        if (note.includes('C')) note = note.replace('C', 'do')
        else if (note.includes('D')) note = note.replace('D', 're')
        else if (note.includes('E')) note = note.replace('E', 'mi')
        else if (note.includes('F')) note = note.replace('F', 'fa')
        else if (note.includes('G')) note = note.replace('G', 'sol')
        else if (note.includes('A')) note = note.replace('A', 'la')
        else if (note.includes('B')) note = note.replace('B', 'si')
        note = note.toLowerCase()
        return note
    },

    convertMidiToEnNote(midi, changeOctave = false) {
        const ret = teoria.note.fromMIDI(midi)
        if (changeOctave) return ret.interval('P-8').scientific()
        return ret.scientific()
    },

    convertMidiToPtNote(midi) {
        const enNote = this.convertMidiToEnNote(midi)
        const ptNote = this.convertEnNoteToPt(enNote, true)
        return ptNote
    },

    convertEnNoteToMidi(note) {
        return teoria.note(note).midi()
    },

    convertPtNoteToMidi(note) {
        const enNote = this.convertPtNoteToEn(note, true)
        return teoria.note(enNote).midi()
        // return teoria.note(note).interval("P8").midi()
    },

    getToneTimeFromOffset(offset) {
        return offset * Tone.Time('4n')
    },
}
