import React, {useEffect, useRef, useState} from 'react';
import {Editor, EditorState, 
  SelectionState, Modifier, 
  getDefaultKeyBinding, KeyBindingUtil,
  convertToRaw, convertFromRaw} from 'draft-js';
import 'draft-js/dist/Draft.css';
import './App.css';
import natural from 'natural';
import Sticky from 'react-stickynode';
import {RiFilterFill} from 'react-icons/ri';
import {FaRemoveFormat} from 'react-icons/fa';
import {AiFillGithub} from 'react-icons/ai';
// talisman package also has potential, different tokenizers, like syllables...
// would be nice to find a chunking algorithm to get nun phrases, etc...
// also would be nice to find phonetics algorithm that converts to IPA (alphabet)
// to look at rhymes and stressed/unstressed syllables

/*
  next steps:
  - perf/readonly style
  - adjustable tags? (like what if prepositions or phrases)
  - look into nlp chunker ?
  - hosted/canonical examples?
  - make code not suck :)
*/

const {hasCommandModifier} = KeyBindingUtil;

const tokenizer = new natural.WordPunctTokenizer()
// const tokenizer = new natural.TreebankWordTokenizer();
// tokenizer = new natural.SentenceTokenizer();

const lexicon = new natural.Lexicon('EN', 'N', 'NNP');
const ruleSet = new natural.RuleSet('EN');
const tagger = new natural.BrillPOSTagger(lexicon, ruleSet);

let styleMap = {
  'NOUN': {
    backgroundColor: '#EFE347',
  },
  'VERB': {
    backgroundColor: '#EFA675',
  },
  'ADJECTIVE': {
    backgroundColor: '#D291BC',
  },
  'ADVERB': {
    backgroundColor: '#FFDFD3',
  },
  'PUNCTUATION': {
    backgroundColor: 'white',
  },
};

function mapPOSCode(code, word) {
  if (word === '—') { // maybe a regex or something? idk..
    return 'PUNCTUATION';
  }

  // idk: EX, FW, LS, POS, SYM
  switch(code) {
    /*
    case 'CC':
    case 'IN':
    case 'TO':
      return 'CONJUNCTION';
    */
    case '.':
    case ',':
    case '(':
    case ')':
      return 'PUNCTUATION'
    /*
    case 'RP':
    case 'DT':
    case 'WDT':
    case 'PDT':
    case 'UH':
      return 'PARTICLE';
    */
    case 'JJ':
    case 'JJR':
    case 'JJS':
      return 'ADJECTIVE';
    // case 'MD':
    case 'VB':
    case 'VBD':
    case 'VBG':
    case 'VBN':
    case 'VBP':
    case 'VBZ':
    case 'VBT':
      return 'VERB';
    case 'RB':
    case 'RBR':
    case 'RBS':
    case 'WRB':
      return 'ADVERB';
    case 'NN':
    case 'NNS':
    case 'NNP':
    case 'NNPS':
    case 'NN':
    case 'PRP':
    // case 'PRP$':
    case 'WP':
    // case 'WP$':
      return 'NOUN';
  }
}

function MyEditor(props) {
  const [editorState, setEditorState] = useState(
    EditorState.createEmpty()
  );
 
  const editor = useRef(null);
 
  function focusEditor() {
    editor.current.focus();
  }
 
  useEffect(() => {
    focusEditor()
  }, []);

  // do I need to use readonly? I could have callback..
  const [readOnly, setReadOnly] = useState(false);
  useEffect(() => {
    if (readOnly) {
      let myEditorState = editorState;
      const editorContent = myEditorState.getCurrentContent();
      editorContent.getBlockMap().map((v) => {
        let selection = SelectionState.createEmpty(v.key);
        
        const tokens = tokenizer.tokenize(v.text);
        const tags = tagger.tag(tokens).taggedWords;

        let index = 0;
        tokens.forEach((w, i) => {

          index = v.text.indexOf(w, index);
          selection = selection.merge({
            anchorOffset: index,
            focusOffset: index + w.length,
          });

          const posTag = mapPOSCode(tags[i].tag, w);
          if (posTag) {
            const newState = Modifier.applyInlineStyle(
              myEditorState.getCurrentContent(),
              selection,
              posTag
            );

            myEditorState = EditorState.push(myEditorState, newState, "change-inline-style");
          } else {
            // console.log(`missed tag: ${w}, ${tags[i].tag}`);
          }

          index += w.length;
        });
      });

      setEditorState(myEditorState);
      setReadOnly(false);
    }
  }, [readOnly]);

  const [filter, setFilter] = useState(null);

  function removeStyles(selectionParam, stateParam, except) {
    const selection = selectionParam || editorState.getSelection();
    let newState = stateParam || editorState.getCurrentContent();

    Object.keys(styleMap).forEach((k) => {
      if (k !== except) {
        newState = Modifier.removeInlineStyle(
          newState,
          selection,
          k
        );
      }
    });

    setEditorState(EditorState.push(editorState, newState, "change-inline-style"));
  }

  function applyPosStyle(pos) {
    const selection = editorState.getSelection();
    if (selection.getAnchorOffset() !== selection.getFocusOffset()) {
      let newState = Modifier.applyInlineStyle(
        editorState.getCurrentContent(),
        selection,
        pos
      );

      removeStyles(selection, newState, pos);
    }
  }

  function myKeyBindingFn(e) {
    if (e.keyCode === 78 /* `N` key */ && hasCommandModifier(e)) {
      return 'noun';
    } else if (e.keyCode === 71 /* `G` key */ && hasCommandModifier(e)) {
      return 'verb';
    } else if (e.keyCode === 74 /* `J` key */ && hasCommandModifier(e)) {
      return 'adjective';
    } else if (e.keyCode === 84 /* `T` key */ && hasCommandModifier(e)) {
      return 'adverb';
    } else if (e.keyCode === 72 /* `H` key */ && hasCommandModifier(e)) {
      return 'punctuation';
    } else if (e.keyCode === 66 /* `B` key */ && hasCommandModifier(e)) {
      return 'clearTag';
    }
    return getDefaultKeyBinding(e);
  }

  function handleKeyCommand(command) {
    if (command === 'noun') {
      applyPosStyle('NOUN');
      return 'handled';
    } else if (command === 'verb') {
      applyPosStyle('VERB');
      return 'handled';
    } else if (command === 'adjective') {
      applyPosStyle('ADJECTIVE');
      return 'handled';
    } else if (command === 'adverb') {
      applyPosStyle('ADVERB');
      return 'handled';
    } else if (command === 'punctuation') {
      applyPosStyle('PUNCTUATION');
      return 'handled';
    } else if (command === 'clearTag') {
      removeStyles();
      return 'handled';
    }
    return 'not-handled';
  }

  function save() {
    const contentState = editorState.getCurrentContent();
    const rawContent = convertToRaw(contentState);
    const stringContent = JSON.stringify(rawContent);

    const file = new Blob([stringContent], {type: 'json'});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, 'draft.json');
    else { // Others
        const a = document.createElement("a");
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = 'draft.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
  }

  function load(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      const rawState = JSON.parse(e.target.result);
      const loadedState = convertFromRaw(rawState);
      setEditorState(EditorState.createWithContent(loadedState));
    };

    reader.readAsText(file);
  }
  
  return (
    <div onClick={focusEditor} className="editor-container">
      <Sticky enabled={true}>
        <div className="button-container" onMouseDown={(e) => e.preventDefault()}>
          <div className="left-buttons-container">
            <button
              onClick={() => setReadOnly(true)}
            >
              Auto-tag
            </button>
            <div className="save-load-btns">
              <button onClick={save}>Save</button>
              <label for="file-select">Load</label>
              <input type="file" onChange={load} id="file-select" />
            </div>
          </div>

          <div className="pos-toolbar">
            <div style={{alignSelf: 'center'}}>
              <button 
                className="clear-style-btn"
                onClick={() => removeStyles()}
              >
                <FaRemoveFormat />
              </button>
            </div>
            {Object.keys(styleMap).map((k) => 
              <div className="pos-buttons">
                <div className="pos-row">
                  <div 
                    className="pos-color" 
                    style={{
                      backgroundColor: styleMap[k].backgroundColor,
                    }}
                  />
                  <button
                    className={`filter-btn ${filter === k ? 'filtered' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setFilter(filter === k ? null : k);
                    }}
                  >
                    <RiFilterFill />
                  </button>
                </div>
                <button 
                  className="pos-button"
                  onClick={(e) => {
                    e.preventDefault();
                    applyPosStyle(k);
                  }}
                >
                  {k}
                </button>
              </div>
            )}
          </div>

        </div>
      </Sticky>
      <Editor
        key={filter}
        ref={editor}
        editorState={editorState}
        /* customStyleMap={styleMap} */
        customStyleFn={(s, b) => {
          const tag = s.toJS()[0];
          if (filter) {
            if (filter === tag) {
              return {
                backgroundColor: 'transparent',
              };
            } else {
              return {
                backgroundColor: 'transparent',
                opacity: 0.1,
              };
            }
          }

          if (tag && styleMap[tag]) {
            return styleMap[tag];
          }
        }}
        onChange={editorState => setEditorState(editorState)}
        handleKeyCommand={handleKeyCommand}
        keyBindingFn={myKeyBindingFn}
        preserveSelectionOnBlur={true}
        placeholder={`Enter text here`}
        readOnly={readOnly}
        {...props}
      />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <MyEditor />
      <div className="github-link">
        <a href="https://github.com/ryapapap/prose-tagger"> Source <AiFillGithub /></a>        
      </div>
    </div>
  );
}

export default App;
