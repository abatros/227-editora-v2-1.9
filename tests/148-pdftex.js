#! /usr/bin/env node

const fs = require('fs')
const assert = require('assert')
const yaml = require('js-yaml')
const { Readable } = require("stream")
const {spawn} = require('child_process')

const s3 = require('../server/lib/aws-s3.js')();
const {parse_s3filename, extract_metadata} = require('../shared/utils.js')
const util = require('util')
const stream = require('stream')
const pipeline = util.promisify(stream.pipeline);

const ts =     new Readable();
      ts.push('---\nfn: abc.txt\n---\n');
//      .push('\\input style-sheet.tex ')
//      .push('\\hOne{My-headline} ')
//      .push('my text here...\\bye\\end')
      ts.push('\n# My-first headline  \n voici du texte...')
      ts.push(null);


async function main() {
  await pipeline(
    s3.__s3client.getObject({
      Bucket: 'caltek',
      Key: 'books/101-dont-go-where/101-chapter-1.md'
    }).createReadStream(),

    /***
    ts,
    ***/

    async function* (source) {
      source.setEncoding('utf8');  // Work with strings rather than `Buffer`s.
      for await (const chunk of source) {
        yield chunk;
      }
    },

    /**************************
    async function* (source) {
//      source.setEncoding('utf8');  // Work with strings rather than `Buffer`s.
      for await (const chunk of source) {
        yield chunk.toLowerCase();
      }
    },
    *********************/

    async function* (source) {
      let state_ = {lineNo:0};

      for await (const chunk of source) {
        const {state, data} = md2tex(chunk,state_)
//        state_ = state;
        //console.log(`\n@41 lineNo:${state_.lineNo}\n`)
        //console.log(`\n------------------\n@57 text:`,data)
        yield data;
      }

      //console.log(`\n@45 lineNo:${state_.lineNo}\n`)
      console.log(`\n------------------\n@48 metadata`,state_.metadata_saved)
    },



    process.stdout
//    fs.createWriteStream('uppercase.txt')
//    pipe(process.stdout)
  )

//  s1.pipe(process.stdout)
/*
  // or 'close'
  .on('end', function(){
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> done@18')
  }); */



}


function md2tex(in_, state) {
  const verbose =0;
  const out =[];

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


  for (let i=0; i<(in_.length)&&(300); i++) {
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
      if (cc == ';') {
        out.push(...(entity2tex(state.entity)));
        state.entity = null;
        state.mode = 'mid-line'
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
        every_headline();
        state.mode = 'new-line'
      } else {
        state.acc.push(cc)
      }
      continue;
    }


    if (state.mode == 'new-line') {
      switch (cc) {
        case '#' :
        state.mode = 'headline';
//        state.acc_type: 'headline';
        state.acc = ['#'];
        continue;

        case '-' :
        state.acc = state.acc || [];
        state.acc.push('-')
        continue; // stay in new-line.
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
//        state.mode = 'token' // maybe state.token is enough.
//        state.entity = ['&'];
        state.entity = ['&']; // do not use acc here - could already be used for headline
        state.mode = 'scanning-entity';
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
  }
  return {data:out.join(''),state}
} // md2tex


function entity2tex(entity) {
  assert(entity[0]=='&')
  entity.splice(0,1);
//  const csname = `\\${entity.splice(0,1).join('')} `
  const csname = `\\${entity.join('')} `
  //console.log(`@104 csname:<${csname}>`)
  return csname;
}

function md2tex_(md) {
  const tex = md.replace(/\# (.*)\n/,`\\h1{$1}`)
        .replace(/\&ndash;/g,'\\endash ')
        .replace(/\&mdash;/g,'\\emdash ')
        .replace(/\&ensp;/g,'\\ensp ')
        .replace(/\&emsp;/g,'\\emsp ')
        .replace(/<iframe[^<]*<\/iframe>/,'')
  return tex;
}


main().catch(console.error);

return;

const s = new Readable();
//const s = Readable.from(["Hello Dolly\\bye\\end"])

//s._read = () => {}; // redundant? see update below
s.push('\\ Hello Dolly.');
s.push('\\input style-sheet.tex ');
s.push('\\hOne{My-headline} ');
s.push('my text here...\\bye\\end');
s.push(null);


const pdftex = spawn('pdftex')

pdftex.stdout.on('data', (data) => {
  console.log(`@18 stdout: ${data}`);
});

pdftex.stderr.on('data', (data) => {
  console.error(`@22 stderr: ${data}`);
});

pdftex.on('close', (code) => {
  console.log(`@26 child process exited with code ${code}`);
//return;
  const pdfStream = fs.createReadStream('./style-sheet.pdf')
//  pdfStream.pipe(process.stout)
  pdfStream.on('open', function () {
  // This just pipes the read stream to the response object (which goes to the client)
    pdfStream.pipe(process.stdout);
  });

});

s.pipe(pdftex.stdin)
