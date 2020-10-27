import { WebApp } from 'meteor/webapp';

import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
//const {list_articles} = require('./utils.js')
//const {get_instance} = require('./index.js')
import {get_instance} from './index.js';

const marked = require('marked');
const renderer = new marked.Renderer(); // standard renderer

const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();

// ---------------------------------------------------------------------------

//WebApp.connectHandlers.use('/caltek/page/', page);

async function page(req, res) {
  const verbose = 1;
  const {url, originalUrl, headers} = req;

  ;(verbose >0) && console.log(`@28 [${module.id}] originalUrl: <${originalUrl}> url:<${url}>`)

  if (url.endsWith('.css')) {
    // we should serve this page directly
    // a better solution would be to have NGINX manage this.
    // ASYNC:
    ;(verbose >0) && console.log(`@34 Serving file <${originalUrl}> directly (ASYNC)`)
    const retv1 = await s3.getObject('s3:/'+originalUrl)
    ;(verbose >0) && console.log(`@36 `,{retv1})
    if (retv1.data) {
      ;(verbose >0) && console.log(`@37 css length:${retv1.data.length}`)
      res.status(200).end(retv1.data)
    } else {
      res.status(200).end('') // to be fixed. return another status
    }
    return;
  }



  function get_base() {
      const k = req.url.length;
      const n = req.originalUrl.length;
      const base = req.originalUrl.substr(0,n-k);
      console.log(`@32 [${module.id}]`,{base})
      return base
  }


  const base = get_base();
  const subsite = get_instance(base);

  if (!subsite) {
      //console.log(`@21 toc`, {req}) // headers, url (after)

      const msg = `@33 [${module.id}] FAILED.
      subsite instance <${base}> not-found
      this is TOC from caltek
      original-Url <${originalUrl}>
      url <${url}>
      `;
      console.error(msg)
      res.status(200).end(msg);
      return;
  }

  const {stylesheet = './page.css', s3dir} = subsite;

  ;(verbose >0) && console.log(`@49 originalUrl:<${originalUrl}>
    page: <${url}>
    `)

  /*********************************************************************

  Use s3dir found in package instance. Not the url.


  **********************************************************************/
  assert(s3dir)
  ;(verbose >0) && console.log(`@88 s3dir:<${s3dir}> page:<${url}>`)
//  throw 'break@89';

//  const retv1 = await s3.getObject('s3:/'+originalUrl+'.md');

  const md_file = 's3://'+s3dir+url+'.md';
  const retv1 = await s3.getObject(md_file); // hoping everything / is ok...

  if (!retv1.data) {
    console.log({retv1})
    res.status(200)
      .end(`@63 [${module.id}]
        md-file not-found <${originalUrl}>
        page <${url}>`)
    return;
  }

  //console.log(retv1.data)
  const {meta,md} = extract_metadata(retv1.data)
  //console.log({md})
  //res.status(200).end(`this is a page from caltek. <${originalUrl}> page <${url}>`)


  const compiled = SSR.compileTemplate('subsite-page',Assets.getText(`views/subsite/page.html`));

  /*
  Object.assign(subsite, {
      Bucket: 'caltek',
      Key: 'books/101-dont-go-where/index-pages.json', //
  }) */

  /******************************************************************

  markdown renderer .....

  *******************************************************************/

  const article = md && marked(md, { renderer: renderer });

  Object.assign(subsite, {
    title:'subsite-page',
    article,
    stylesheet,
  });

  console.log(`@131 subsite:`,subsite)

//  Object.assign(subsite, {article});


  const html = SSR.render('subsite-page',subsite);

  res.status(200).end(html)
return;

  res.status(200).end(`this is a page from Subsite. <${originalUrl}> page <${url}>`)
}

module.exports = page;
