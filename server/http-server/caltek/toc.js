import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';
import {parse_s3filename} from '/shared/utils.js'

import { WebApp } from 'meteor/webapp';
//WebApp.connectHandlers.use('/caltek/index-pages', index_pages);

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
const {list_pages, get_instance} = require('./utils.js')
//const {get_instance} =
//require('./init-instance.js')


const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();

module.exports = toc;

async function toc(req, res, next) {
  const verbose =1;
  const audit =[];
  const etime_ = new Date().getTime();
  let {originalUrl, url, headers} = req;

  if (originalUrl.endsWith('/')) originalUrl = originalUrl.slice(0,-1)

  console.log(`@28 [${module.id}] originalUrl: <${originalUrl}> url:<${url}>`)

  if (url && (url.length>1)) { // ignore "/"
    // we should not be here
    next(); // will pick the next-one /caltek/books/....
    return;
  }

/*******************
//  const url = req.originalUrl;
  function get_base() {
    const k = url.length;
    const n = originalUrl.length;
    const base = originalUrl.substr(0,n-k+1);
    console.log(`@32 `,{base})
    return base
  }


  const base = get_base();
  assert(base.)
***************************/



  const subsite = get_instance(originalUrl);

  if (!subsite) {
    //console.log(`@21 toc`, {req}) // headers, url (after)

    const msg = `@33 [${module.id}] FAILED.
    subsite instance <${originalUrl}> not-found
    this is TOC from caltek
    original Url <${originalUrl}>
    url <${url}>
    `;
    console.error(msg)
    res.status(200).end(msg);
    return;
  }


  /********************************************************************




  *********************************************************************/


  console.log(`@25 `,{subsite})
  const s3dir = originalUrl; // !!!! not exactly true....
  const s3fn = 's3:/'+path.join(s3dir,'index-pages.json');
  console.log({s3fn})
  const retv1 = await s3.getObjectMetadata(s3fn)
  if (audit) audit.push({etime:new Date().getTime()-etime_, label:`getObjectMetadata(index-pages.json)`})
  console.log(`@678 `,{retv1})


  if (!retv1.ETag) {
    console.log(`@682 `,{retv1})
    let {pages, error, Bucket, Key} = await list_md_files('s3:/'+s3dir) // not correct...
    ;(verbose >0) && console.log(`@389 [${module.id}] found ${pages.length} pages.`)
    audit.push(`${new Date().getTime()-etime_} list-pages (${pages.length})`)

    await s3.putObject(s3fn, JSON.stringify(pages, null, ' '))
  }


//  const html = await Assets.getText('views/caltek-book/toc-json.html');
//  audit.push({etime:new Date().getTime()-etime_, label:`Asset.getText`})

  /*
  function compile(tpName) {
    return compiled = SSR.compileTemplate(tpName, Assets.getText(`views/caltek-book/${tpName}`));
  }*/


  const compiled = SSR.compileTemplate('caltek-toc-json',Assets.getText(`views/caltek-book/toc-json.html`));

  Object.assign(subsite, {
    Bucket: 'caltek',
    Key: 'books/101-dont-go-where/index-pages.json', //
  })

  const html_ = SSR.render('caltek-toc-json', subsite);

  const script = Assets.getText(`views/caltek-book/toc-json.handlebars`)

  const html = html_.replace('</body>', '</body>\n\n'+script); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  res.status(200).end(html)
  audit.push({etime:new Date().getTime()-etime_, label:`sending`})

return;
  res.status(200).end(`
    this is TOC from caltek <${req.originalUrl}>
    ${JSON.stringify(subsite,null,1)}
    `)
}



async function list_md_files(s3dir) {
  const {Bucket,Key} = parse_s3filename(s3dir)
  console.log(`@77 `,{Bucket},{Key},{s3dir})
  const retv2 = await s3.readdir_nofix({Bucket, Prefix:Key});
  ;(verbose >0) && console.log(`@58 found ${retv2.Keys.length} Keys`)

  const k = Key.length;
  const pages = retv2.Keys
      .filter(it => (it.endsWith('md')))
      .map(it => it.substring(k+1)); // maybe path.parse here


  console.log(`@80 listing:`,pages);
  return {pages,Bucket,Key}
}
