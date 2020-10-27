#! /usr/bin/env node

const fs = require('fs')
const assert = require('assert')

/*****************************************************************************

const {data,state} = md2tex(input, state)


initial state_ = {lineNo:0};


******************************************************************************/


function md2tex(in_, state = {lineNo:0}) {
  const verbose =2;
  const out =[];

  state.lineNo = state.lineNo || 0;
  state.mode = state.mode || 'new-line';

  function quit_metadata_mode() {
    ;(verbose >0) &&console.log(`@85 metadata quit metadata:`,yaml.safeLoad(state.metadata.join('').replace(/\t/g,'   ')))
    // quit metadata mode
    state.metadata_saved = state.metadata_saved || [];
    state.metadata_saved .push(state.metadata.join(''));
    state.metadata = null;
    state.metadata_tail = null;
    state.mode = 'mid-line' // we did not reach \n
    state.acc =null;
  }

  function every_headline() {
    const h = state.acc.join('')
    console.log(`@85 every_headline =>`, h)
    if (state.acc[0] == '#') {
      out.push(`\\h1{${h.substring(2)}}\n`)
    }
    state.acc = null;
  }

  function enter_mid_line() {
    state.mode = 'mid-line';
    state.acc =null;
  }

  function enter_entity_mode(cc) {
    console.log(`@272 found '&' leaving mode ${state.mode}`)
    state.entity_restore = state.mode;
    state.entity = ['&']; // do not use acc here - could already be used for headline
    state.mode = 'scanning-entity';
  }

  function close_entity() {
    const en = entity2tex(state.entity);
    console.log(`closing entity <${en}>`, state.entity)
    if (state.entity_restore == 'headline' ) {
      state.acc.push(...en);
    } else {
      out.push(...en);
    }
    state.entity = null;
    state.mode = state.entity_restore;
  }

  function every_new_line() {
    switch (state.mode) {
      case 'scanning-entity':
      console.error(`@96 new-line before closing entity (${state.acc})`)
      break;

      case 'tagIn':
      console.error(`@97 new-line before closing tagIn (${state.acc})`)
      break;

      case 'tagOut':
      console.error(`@96 new-line before closing tagOut (${state.acc})`)
      break;

      case 'headline':
      console.log(`@108 every_scan_line =>`, acc.join(''))
      console.log(`@109 process =>`, acc.join(''))
      every_headline();
      state.mode = 'new-line'
      break;

      default:
      state.mode = 'new-line'
    }
  }


  // main-loop
  for (let i=0; i<(in_.length); i++) {
    const cc = in_.charAt(i);

    ;(verbose >1) &&console.log(`@122 getNext=> (${cc}) mode:<${state.mode}>`)

    if (state.mode == 'metadata') {
      // take everything until \n----
      // this is similar to HTML tag .... except...
      switch (cc) {
        case '\n':
        if (state.metadata_tail && (state.metadata_tail.length >=2)) {
          quit_metadata_mode()
          continue;
        }

        state.metadata_tail = [];
        //console.log(`@79 new-line in metadata `,state.metadata.join(''))
        state.metadata.push(cc);
        continue;

        case '-':
          if (state.metadata_tail) {
            state.metadata_tail.push(cc);
            //console.log(`@85 another dash in metadata (${state.metadata_tail.join('')}) `,state.metadata.join(''))
          } else {
            state.metadata.push(cc);
          }
          continue;

        default:
          // here not - and not \n:
          if (state.metadata_tail && (state.metadata_tail.length >=2)) {
            quit_metadata_mode()
            continue;
          }
          if (state.metadata_tail) {
            //console.log(`@100 metadata (${cc}) tail:(${state.metadata_tail.join('')}) continue metadata`)
            // restore
            // only 1 !!!!
            state.metadata.push(...state.metadata_tail)
            state.metadata_tail = null;
          }
          //console.log(`@106 metadata (${cc})`)
          state.metadata_tail = null;
          state.metadata.push(cc);
      } // switch
      continue;
    } // metadata mode


    // intercept # (everything starting a line.)
    // \n### \n> \n. (dot) something They all end with space or \n

    //if


    if (state.mode == 'scanning-entity') {
      // we are expecting a ';'
      // we could be in headline - if so restore mode := headline
      if (cc == ';') {
        close_entity()
      } else {
        state.entity.push(cc)
      }
      continue;
    }


    if (state.mode == 'tagOut') {
      if (cc == '>') {
        ;(verbose >0) &&console.log(`@88 tagOut:`,state.tagOut.join(''))
        ;(verbose >0) &&console.log(`@88 tagIn:`,state.tagIn.join(''))
        ;(verbose >0) &&console.log(`@89 leaving tagOut with tagContent:`,state.tagContent.join(''))
        state.tagIn = null;
        state.tagContent = null;
        state.tagOut = null;
        // check tagIn == tagOut then decide what to do...
        // here ignore,
        state.mode = 'mid-line'
      } else {
        state.tagOut.push(cc)
      }
      continue;
    }


    if (state.mode == 'tagContent') {
      assert(state.tagContent)
      // accumulate until until '</' is found.
      if (cc == '<') {
        ;(verbose >0) &&console.log(`@101 tagContent:`,state.tagContent.join(''))
        state.tagOut = [];
        state.mode = 'tagOut'
      } else {
        state.tagContent.push(cc)
      }
      continue;
    }

    if (state.mode == 'tagIn') {
      if (cc == '>') {
        ;(verbose >0) &&console.log(`@111 `,state.tagIn.join(''));
//        state.tagIn = null; don't close
        state.tagContent = [];
        state.mode = 'tagContent'
      } else {
        state.tagIn.push(cc)
      }
      continue;
    }

    state.mode = state.mode || 'new-line';

    switch(state.mode) {
      case 'headline': // accumulate until end of line
      if (cc == '\n') {
        // signal to eject the headline
        every_headline();
        state.mode = 'new-line'
      } else {
        if (cc == '&') {
          enter_entity_mode(cc)
        } else {
          state.acc.push(cc)
        }
      }
      continue;
    }


    if (state.mode == 'new-line') {
      ;(verbose >1) && console.log(`in new-line cc:<${cc}>`)
      switch (cc) {
        case '#' :
        state.mode = 'headline';
//        state.acc_type: 'headline';
        ;(verbose >1) && console.log(`*** switching to mode <headline>`)
        state.acc = ['#'];
        continue;

        case '-' :
        state.acc = state.acc || [];
        state.acc.push('-')
        continue; // stay in new-line.

        case '\n':
        ;(verbose >1) && console.log(`in new-line cc:<${cc}> do nothing.`)
        continue;

        default: // continue outside switch.
      } // switch


      // get into mid-line or ????

      assert(cc != '-');

      if (state.acc && (state.acc.length >=3)) {
        assert(cc != '-');
        assert(state.mode == 'new-line')
        // enter_metadata
        state.mode = "metadata"
        state.metadata = [];
        ;(verbose >0) &&console.log(`@173 switch to mode METADATA (${state.acc.length})`)
        continue;
      }

      if (state.acc) {
        assert(cc != '-');
        assert(state.mode == 'new-line')
        assert((state.acc.length <3)) // cound be (<2)
        // false alert - restore
        out.push(...state.acc.join(''));
        state.acc = null;
        enter_mid_line()
        continue;
      }

      out.push(cc)
      state.mode = 'mid-line';
      continue;
    } // new-line



    switch(cc) {
      //case 'o': out.push('O'); break;

      case '&': // enter mode token
        enter_entity_mode(cc);
        break;

      case '<': // enter TAG mode
  //        state.mode = 'token' // maybe state.token is enough.
        state.tagIn = []; // not null.
        state.mode = 'tagIn'
        break;

      case '\n': state.lineNo ++; // NO break
        out.push(cc);
        every_new_line();
        break;

      default:
      out.push(cc);
    }
  } // main-loop
  return {data:out.join(''),state}
} // md2tex


function entity2tex(entity) {
  if(entity[0] !='&') {
    console.log(`@309 entity:`,entity)
    throw 'fatal@309'
  }
  entity.splice(0,1);
//  const csname = `\\${entity.splice(0,1).join('')} `
  const csname = `\\${entity.join('')} `
  //console.log(`@104 csname:<${csname}>`)
  return csname;
}


function __md2tex(md) {
  const tex = md.replace(/\# (.*)\n/,`\\h1{$1}`)
        .replace(/\&ndash;/g,'\\endash ')
        .replace(/\&mdash;/g,'\\emdash ')
        .replace(/\&ensp;/g,'\\ensp ')
        .replace(/\&emsp;/g,'\\emsp ')
        .replace(/<iframe[^<]*<\/iframe>/,'')
  return tex;
}


// --------------------------------------------------------------------------

const test1 = `
# main &mdash; title.
hello &mdash; hey!
\\bye.
`

const {data,state} = md2tex(test1)
console.log(data)
