<template>
    <div id="app">
        <div class="container mt-3">
            <div id="buttons">
                <button class="btn" @click="playing = !playing">
                    <FontAwesomeIcon
                        :icon="playing ? 'stop' : 'play'"
                    ></FontAwesomeIcon>
                </button>
                <button
                    class="btn"
                    :class="{ active: looping }"
                    @click="looping = !looping"
                >
                    <FontAwesomeIcon icon="undo-alt"></FontAwesomeIcon>
                </button>
                <button class="btn float-right" @click="muted = !muted">
                    <FontAwesomeIcon
                        :icon="muted ? 'volume-mute' : 'volume-up'"
                    ></FontAwesomeIcon>
                </button>
            </div>

            <div id="editor" class="mt-3"></div>

            <div id="piano" class="mt-3"></div>

            <div id="inputs" class="mt-3">
                <input
                    v-model="inputNote"
                    type="text"
                    class="form-control no-select"
                    maxlength="4"
                    size="5"
                    placeholder="do3"
                    @input="inputNoteChanged"
                    @keypress="inputNoteKeyPressed"
                />
                <input
                    v-model.number="inputMidi"
                    type="number"
                    step="1"
                    placeholder="60"
                    class="form-control no-select"
                    :class="{ error: !isValidMidi(inputMidi) }"
                    :min="pianoLowNote"
                    :max="pianoHighNote"
                    @input="inputMidiChanged"
                    @keypress="inputMidiKeyPressed"
                />
            </div>
        </div>
    </div>
</template>

<script src="./app.js"></script>

<style lang="scss">
@import './icons';

:root {
    --bg: #7ebed9;
    --accent: #da7c7c;
    --highlight: #a8d1ff;
    --border-radius: 4px;
}

html,
body,
#app {
    background-color: var(--bg);
    max-width: 800px;
    margin: 0 auto;
}

#app {
    margin-top: 60px;
}

#buttons {
    button {
        padding: 0;
        width: 50px;
        height: 50px;
        margin-right: 10px;
        svg {
            width: 30px;
            height: 30px;
        }
        &:last-child {
            margin-right: 0;
        }
    }

    .active {
        background: var(--accent);
    }
}

#editor {
    .error {
        color: red;
        font-style: italic;
    }
    .CodeMirror {
        border-radius: var(--border-radius);
        font-size: 16px;
        background-image: unset !important;
    }
    .CodeMirror-gutters {
        border-left-color: transparent !important;
    }
    .CodeMirror-selected {
        background: var(--highlight) !important;
    }
    .CodeMirror-linenumber.CodeMirror-gutter-elt {
        &.active {
            color: var(--accent);
            font-weight: bold;
        }
    }
}

#piano {
    div {
        background-color: transparent !important;
    }
}

#inputs {
    text-align: center;
    border-radius: var(--border-radius);
    font-family: monospace;
    input {
        color: var(--accent);
        display: inline-block;
        text-align: center;
        margin-right: 10px;
        width: 80px;
        &.error {
            border: 1px solid red;
        }
        &::placeholder {
            color: lightgrey;
        }
    }
}

* {
    .no-select {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    &:focus {
        outline: none !important;
    }
}
</style>
