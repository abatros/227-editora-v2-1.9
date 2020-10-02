import { WebApp } from 'meteor/webapp';

import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
const {list_articles} = require('./utils.js')

const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();

// ---------------------------------------------------------------------------

WebApp.connectHandlers.use('/museum-api/page/', page);


let page_compiled =null;
//let page_template_compiled =null;
function compile(tpName) {
  const compiled = SSR.compileTemplate(tpName, Assets.getText(`views/museum/${tpName}.html`));
}


async function page(req, res) {
  const {dir, base:xid} = path.parse(req.originalUrl);
  assert(xid, req.originalUrl, 'missing xid')

  if (!db) {
      console.log(`@120 INIT POSTGRES/BLUEINK CONNECTION`)
    db = await postgres_connect()
  }

  page_compiled = page_compiled || compile('page')
//  page_template_compiled = page_template_compiled || compile('page-template')

  const page = await db.query(`
    select *
    from adoc.pagex
    where (path <@ 'museum.md') and (xid = $1)
    ;`,[xid],{single:true});


//  .then( page =>{
    (verbose >0) && console.log(`@25: page `,page)
    const html = SSR.render('page',{
      it:page,
      isTranscription: ()=>{
        return (page.data.transcription);
      },
      part: (x)=>{
        if (x>0) {
          return `part:${x+1} - `;
        }
      },
      _: function(key){return i18n.__(key)}
    });

    //console.log(`etime: ${new Date().getTime()-etime}`);

    res.status(200).end(html);
//      .end(SSR.render('page-template',{html:html}));


//  res.status(200).end(`ok <${xid}>`)
}
