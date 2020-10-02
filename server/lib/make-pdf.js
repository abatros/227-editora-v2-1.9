const path = require('path')
const assert = require('assert')
const yaml = require('js-yaml')
const s3 = require('./aws-s3.js')();
const {parse_s3filename, extract_metadata} = require('/shared/utils.js')
const utils = require('./utils.js')
const {spawn} = require('child_process')

//let db = null; //  must be in async await postgres_connect();
//const {postgres_connect} = require('/server/lib/postgres-connect.js')

//const util2 = require('/shared/utils.js')

/*
const fs = require('fs-extra');
const Massive = require('massive');
const monitor = require('pg-monitor');
require ('./methods/deep-search.js')
require ('./methods/refresh-web-page.js')
require ('./methods.js')
import {fix_folder_v2, fix_md_mime_type, migration_v1} from './lib/utils.js'

*/

module.exports = make_pdf;

async function make_pdf(s3fn, o={}) {
  const verbose =1;
  console.log(`Entering make_pdf(${s3fn}) options:`,o) // expect folder name with .publish.yaml

  try {
    const {Bucket, Key, subsite, xid, base, ext} = parse_s3filename(s3fn)
    if (ext) {
      return {error: `invalid subsite`}
    }

    /*************************************************************
        Get publish.yaml
    **************************************************************/

    const cfgKey = path.join(Key,'.publish.yaml')
    const retv1 = await s3.getObject({Bucket, Key:cfgKey})
    if (retv1.error) {
      return {error: `file-not-found <${Bucket}><${cfgKey}>`}
    }
    const cfg = yaml.safeLoad(retv1.data);
    const root_url = cfg['root-url'];
    if (!root_url) {
      console.error(`@48 Missing root-url`);
      console.log(`@48 cfg <${cfgKey}>`,{retv1})
      return {error:`@48 Missing root-url`}
    }

    /*************************************************************
        Get list of chapters or pages.
    **************************************************************/

    const retv2 = await s3.readdir_nofix({Bucket, Prefix:Key});
    ;(verbose >0) && console.log(`@58 found ${retv2.Keys.length} Keys`)

    for (Key_ of retv2.Keys) {
      if (!Key_.endsWith('.md')) continue;
      ;(verbose >0) && console.log(`@62 processing md-file <${Bucket}><${Key_}>`)
      const retv1 = await s3.getObject({Bucket, Key:Key_})
      ;(verbose >0) && console.log(`@64 data.length:${retv1.data.length}`)
      const {meta,md} = extract_metadata(retv1.data);
      if (!meta) {
        console.log(`@68 md-file:`,retv1.data)
      }

      const tex = md2tex(md);
//      console.log({tex});

      const retv2 = await pdftex({Bucket,Key});
      console.log(`@76 done.`,{retv2})

      break;
    }
  }
  catch(err) {
    return err;
  }

} // make-pdf


async function pdftex({Bucket,Key}) {

  return new Promise((resolve,reject) =>{

    const s1 = s3.__s3client.getObject({Bucket, Key:Key_}).createReadStream();
    /*
    s1.on('data', (chunk) => {
      console.log(`Received ${chunk.length} bytes of data.`);
    });
    s1.on('end', () => {
      console.log('There will be no more data.');
      resolve('end@97')
      return;
    });
    */

    s1.on('end',()=>{
      resolve('close@104')
      return;
    })


    s1.pipe(process.stdout)
      .on('end', () => {
        console.log('@104 There will be no more data.');
        resolve('ok@92')
        return;
      })
      .on('close',()=>{
        resolve('ok@92')
        return;
      })
    console.log(`@92 `,{s1})
    //await .pipe(process.stdout)

    const sink = spawn('cat', [],
      {stdio: ['pipe', process.stdout, process.stderr]}); // (A)

    writeToWritable(sink.stdin); // (B)
    /*await*/ onExit(sink);

    console.log('### DONE');

    async function writeToWritable(writable) {
      await streamWrite(writable, 'First line\n');
      await streamWrite(writable, 'Second line\n');
      await streamEnd(writable);
    }

return;

    const p = spawn('pdftex',['input.tex'])


    p.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    p.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    p.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(code)
    });

  })
}



function md2tex(md) {
  const tex = md.replace(/\# (.*)\n/,`\\h1{$1}`)
        .replace(/\&ndash;/g,'\\endash ')
        .replace(/\&mdash;/g,'\\emdash ')
        .replace(/\&ensp;/g,'\\ensp ')
        .replace(/\&emsp;/g,'\\emsp ')
  return tex;
}
