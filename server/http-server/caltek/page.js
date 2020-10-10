import { WebApp } from 'meteor/webapp';

import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
//const {list_articles} = require('./utils.js')
const {get_instance} = require('./utils.js')

const marked = require('marked');
const renderer = new marked.Renderer(); // standard renderer

const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();

// ---------------------------------------------------------------------------

//WebApp.connectHandlers.use('/caltek/page/', page);

async function page(req, res) {
  const {url, originalUrl, headers} = req;

  console.log(`@28 [${module.id}] originalUrl: <${originalUrl}> url:<${url}>`)

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

  console.log(`@49 originalUrl:<${originalUrl}>
    page: <${url}>
    `)

  const retv1 = await s3.getObject('s3:/'+originalUrl+'.md');
  if (!retv1.data) {
    console.log({retv1})
    res.status(200).end(`@58 this is a page from caltek. <${originalUrl}> page <${url}>`)
    return;
  }

  //console.log(retv1.data)
  const {meta,md} = extract_metadata(retv1.data)
  //console.log({md})
  //res.status(200).end(`this is a page from caltek. <${originalUrl}> page <${url}>`)


  const compiled = SSR.compileTemplate('caltek-page',Assets.getText(`views/caltek-book/page.html`));

  /*
  Object.assign(subsite, {
      Bucket: 'caltek',
      Key: 'books/101-dont-go-where/index-pages.json', //
  }) */

  /******************************************************************

  markdown renderer .....

  *******************************************************************/

  const article = md && marked(md, { renderer: renderer });

  const html = SSR.render('caltek-page',{
    title:'caltek-page',
    article,
  })

  res.status(200).end(html)
return;

  res.status(200).end(`this is a page from caltek. <${originalUrl}> page <${url}>`)
}

module.exports = page;
