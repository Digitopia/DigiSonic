import Vue from 'vue'

import Tone from 'tone'
import WebMidi from 'webmidi'
import CodeMirror from 'codemirror'
import Nexus from 'nexusui'
import teoria from 'teoria'
import { debounce } from 'lodash'

import examples from '@/examples'
import noteUtils from '@/noteUtils'
import themes from '@/themes'
import * as errors from '@/errors'

import { library } from '@fortawesome/fontawesome-svg-core'
import {
    faPlay,
    faStop,
    faUndoAlt,
    faVolumeUp,
    faVolumeMute,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
library.add(faPlay, faStop, faUndoAlt, faVolumeUp, faVolumeMute)
Vue.component('FontAwesomeIcon', FontAwesomeIcon)

import 'codemirror/theme/mdn-like.css'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/javascript/javascript.js'
import '@/digiSonicMode'

export default {
    name: 'app',

    data() {
        return {
            playing: false,
            looping: false,
            muted: false,
            reevalute: false,
            loaded: false,
            lines: [],
            inputNote: null,
            inputMidi: null,
            bpm: 60,
            samples: {
                C3: 'C3.mp3',
                E3: 'E3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                E4: 'E4.mp3',
                G4: 'G4.mp3',
            },
            samplesBasePath: 'sounds/piano/',
            pianoLowNote: 48,
            pianoHighNote: 84,
        }
    },

    mounted() {
        this.init()
        const debouncedResize = debounce(() => this.resize(), 100)
        window.onresize = () => {
            debouncedResize()
        }
    },

    watch: {
        playing: function() {
            if (this.playing) this.play()
            else this.stop()
        },
        looping: function() {
            Tone.Transport.loop = this.looping
        },
        muted: function() {
            Tone.Master.mute = this.muted
        },
    },

    methods: {
        init() {
            this.initEditor()
            this.initPiano()
            this.initAudio()
            this.initMidi()
        },

        initEditor() {
            const lines = examples.nota

            this.editor = CodeMirror(document.querySelector('#editor'), {
                value: lines.join('\n'),
                mode: 'digi-sonic-mode',
                theme: themes.find(theme => theme === 'mdn-like'),
                lineNumbers: true,
                gutter: true,
                showCursorWhenSelecting: true,
            })

            window.editor = this.editor

            this.editor.addKeyMap({
                'Shift-Enter': () => {
                    // this.reevalute()
                    this.reevalute = true
                },
                'Ctrl-Enter': () => {
                    // this.reevalute()
                    this.reevalute = true
                },
                'Ctrl-S': () => {
                    this.playing = !this.playing
                },
                'Ctrl-L': () => {
                    this.looping = !this.looping
                },
            })
        },

        initPiano() {
            this.piano = new Nexus.Piano('#piano', {
                mode: 'button', // 'button', 'toggle', or 'impulse'
                lowNote: this.pianoLowNote,
                highNote: this.pianoHighNote,
            })
            this.resizePiano()
            this.piano.colorize('accent', 'var(--accent)')
            this.piano.on('change', v => {
                this.pianoChanged(v)
            })
        },

        initAudio() {
            Tone.Transport.bpm.value = this.bpm

            this.sampler = new Tone.Sampler(
                this.samples,
                () => {
                    this.loaded = true
                },
                this.samplesBasePath
            ).toMaster()

            Tone.Transport.on('loopEnd', () => {
                if (this.reevalute) {
                    this.play()
                    this.reevalute = false
                }
                this.clearPiano()
            })
        },

        initMidi() {
            WebMidi.enable(err => {
                if (err) {
                    console.log('Web Midi API not available')
                    return
                }
                console.log('Web Midi API available')
                if (WebMidi.inputs.length === 0) {
                    console.log('There is no input connected right now')
                    return
                }
                const input = WebMidi.inputs[0] // TODO: test if other inputs availables
                input.addListener('noteon', 'all', evt => {
                    const midi = evt.note.number
                    if (
                        midi >= this.piano.settings.lowNote &&
                        midi <= this.piano.settings.highNote
                    ) {
                        this.inputMidi = evt.note.number
                        this.pianoInputMidi.dispatchEvent(new Event('input'))
                    }
                })
            })
        },

        play() {
            if (!this.loaded) return
            if (Tone.context.state === 'suspended') Tone.context.resume()
            this.clearPiano()
            Tone.Transport.cancel(0) // cancel all events (if exist) after 0
            this.schedule()
            Tone.Transport.start()
        },

        stop() {
            Tone.Transport.stop()
            this.clearPiano()
            this.clearGutter()
        },

        schedule() {
            const text = this.editor.getValue()
            this.lines = text.split('\n')

            this.offset = 0

            this.editor.getAllMarks().forEach(mark => mark.clear())

            for (let i = 0; i < this.lines.length; i++) {
                const line = this.lines[i]
                try {
                    this.processLine(line, i)
                } catch (err) {
                    console.log('error on line', i + 1)
                    if (err instanceof errors.InvalidMidi) {
                        //
                    } else if (err instanceof errors.InvalidNote) {
                        console.log('invalid note')
                    } else if (err instanceof errors.InvalidInstruction) {
                        //
                    }
                    console.log('err.msg', err.msg)
                    this.editor.markText(
                        { line: err.line, ch: 0 },
                        { line: err.line + 1, ch: 0 },
                        { className: 'error', title: err.msg }
                    )
                    Tone.Transport.cancel()
                    // this.playing = false
                    break
                }
            }

            // Manually set loopEnd mark, since tonejs doesn't seem to do so
            Tone.Transport.loopStart = 0
            const loopEnd = noteUtils.getToneTimeFromOffset(this.offset)
            Tone.Transport.loopEnd = loopEnd

            // Need to manually listen for loopEnd (even if not looping) to change in UI stop button to play
            Tone.Transport.schedule(() => {
                if (!this.looping) this.playing = false
            }, loopEnd)
        },

        processLine(line, idx) {
            if (line.trim() === '') return

            const tokens = line.trim().split(' ')
            const inst = tokens[0]
            const param = tokens[1]

            const time = noteUtils.getToneTimeFromOffset(this.offset)

            if (inst === 'toca') {
                const ptNote = noteUtils.parseNote(param)
                const midi = noteUtils.convertPtNoteToMidi(ptNote)

                if (!this.isValidMidi(midi)) {
                    throw new errors.InvalidMidi(midi, idx)
                } else if (!this.isValidNote(ptNote)) {
                    console.log('invalid note 0')
                    throw new errors.InvalidNote(ptNote, idx)
                }

                // play note and piano highlight
                Tone.Transport.schedule(t => {
                    this.sampler.triggerAttackRelease(ptNote, '4n', t)
                    this.piano.toggleKey(midi)
                }, time)

                // piano dehighlight
                Tone.Transport.schedule(() => {
                    this.piano.toggleKey(midi)
                }, noteUtils.getToneTimeFromOffset(this.offset + 1))
            } else if (inst === 'espera') {
                // line highlight
                Tone.Transport.schedule(() => {
                    this.highlightLine(idx)
                }, time)

                this.offset += Number(param)
            } else {
                throw new errors.InvalidInstruction(inst, idx)
            }
        },

        // reevalute() {

        // },

        inputMidiKeyPressed(evt) {
            if (!this.inputMidi) {
                console.log('returning')
                return
            }
            if (this.inputMidi.toString().length >= 2) {
                console.log('preventing default')
                evt.preventDefault()
            }
            console.log('not preventing default')
        },

        isValidMidi(midi) {
            return (
                !midi ||
                (midi >= this.pianoLowNote && midi <= this.pianoHighNote)
            )
        },

        isValidNote() {
            return true
        },

        inputMidiChanged() {
            if (!this.isValidMidi(this.inputMidi) || this.inputMidi === '')
                return
            console.log('didnt return')
            this.clearPiano()
            this.piano.toggleKey(this.inputMidi)
        },

        inputNoteChanged() {
            if (this.backspacing) return
            try {
                const midi = noteUtils.convertPtNoteToMidi(this.inputNote)
                this.clearPiano()
                this.piano.toggleKey(midi)
            } catch (e) {
                console.log('invalid note format', e)
            }
        },

        inputNoteKeyPressed(evt) {
            const key = evt.keyCode || evt.charCode
            if (key === 8 || key === 46) this.backspacing = true
            else this.backspacing = false
        },

        pianoChanged(evt) {
            if (this.playing) {
                return
            }
            if (this.playing) return
            const midi = evt.note
            if (evt.state) {
                this.inputMidi = midi
                const ptNote = noteUtils.convertMidiToPtNote(midi)
                const enNote = noteUtils.convertMidiToEnNote(midi, false)
                this.inputNote = ptNote
                if (!this.playing) {
                    this.sampler.triggerAttackRelease(
                        teoria
                            .note(enNote)
                            .interval('P-8')
                            .scientific(),
                        '8n'
                    )
                }
            }
        },

        clearPiano() {
            this.piano.keys.forEach(key => {
                key.state = false
            })
        },

        clearGutter() {
            const sel = '.CodeMirror-linenumber.CodeMirror-gutter-elt'
            const lines = document.querySelectorAll(sel)
            lines.forEach(line => {
                line.classList.remove('active')
            })
        },

        highlightLine(lineIdx) {
            this.clearGutter()
            const sel = '.CodeMirror-linenumber.CodeMirror-gutter-elt'
            document.querySelectorAll(sel)[lineIdx].classList.add('active')
        },

        resize() {
            this.resizePiano()
        },

        resizePiano() {
            this.pianoRatio = 500 / 125
            const pianoWidth = document.getElementById('editor').clientWidth
            this.piano.resize(pianoWidth, pianoWidth / this.pianoRatio)

            document.querySelectorAll('rect').forEach(rect => {
                const r = 4
                rect.setAttribute('rx', r)
                rect.setAttribute('ry', r)
                if (rect.getAttribute('fill') === '#333') {
                    const rw = Number.parseFloat(rect.getAttribute('width'))
                    const rx = Number.parseFloat(rect.getAttribute('x'))
                    const rr = 0.75
                    const nrx = rx + ((1 - rr) / 2) * rw
                    rect.setAttribute('width', rw * rr)
                    rect.setAttribute('x', nrx)
                }
            })
        },
    },
}
