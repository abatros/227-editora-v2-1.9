import { WebApp } from 'meteor/webapp';

/****************************

  for a3,a4. (titres)

*****************************/

WebApp.connectHandlers.use('/museum-api/index-titres', index_titres);

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

async function index_titres(req, res) {
  const verbose =1;
  const etime_ = new Date().getTime();
  const audit =[];

  const retv1 = await s3.getObjectMetadata('s3://museum/index-titres.json')
  audit.push({etime:new Date().getTime()-etime_, label:`getObjectMetadata(titres)`})
  console.log(`@678 `,{retv1})


  if (!retv1.ETag) {
    console.log(`@682 `,{retv1})
    const {data:xlsx, error} = await list_articles({path:'museum.md.a'})
    ;(verbose >0) && console.log(`@389 [${module.id}] found ${xlsx.length} titres.`)
    audit.push(`${new Date().getTime()-etime_} list-articles (${xlsx.length})`)

    /*
    await fix_constructeurs(xlsx);
    audit.push({etime:new Date().getTime()-etime_, label:`rebuild ${xlsx.length} constructeurs`})
    */


    // THIS SHOULD BE DONE ON THE CLIENT if we want to reduce transfer time.

    let xi = XI_titres(xlsx);
    audit.push({etime:new Date().getTime()-etime_, label:`XI`})
    xi = JSON.stringify(xi,null,' ');

    const retv2 = await s3.putObject('s3://museum/index-titres.json', xi);
    audit.push({etime:new Date().getTime()-etime_, label:`putObject(titres)`})

    res.status(200)
      .end(`index-titres ${xlsx.length} entries has been updated.
        Please retry preferably using [F5] key.`)

    return;
  }


  const html = await Assets.getText('views/museum/index-titres.html');
  audit.push({etime:new Date().getTime()-etime_, label:`Asset.getText`})

  res.status(200).end(html)
  audit.push({etime:new Date().getTime()-etime_, label:`sending`})

  console.log(`@644 audit (index-titres):\n`,
    audit.map((it,j) =>{
      const _etime = (j>0)? it.etime - audit[j-1].etime: it.etime;
      return `-- ${it.etime} [${_etime}] ${it.label}`;
    }).join('\n'))


} // index-titres


function XI_titres(xlsx) {
  // we add an entry for each titre (and alternate inames).

  let mCount = 0;
  console.log(`@847 entering XI_titres (${xlsx.length})`)
  const xi = []; // NOT a hash - we accept collisions.
  for (const a1 of xlsx) {
    const {item_id, xid, yp, name, title ='*missing*', links=[],
      transcription, restricted, indexnames:indexNames, auteurs=[]} = a1;

    links.forEach((pdf)=>{
      pdf.fn2 = pdf.fn
      .replace(/^[0-9\s]*\s*/,'') // remove 'ca' !!!!
      .replace(/[\s\-]*[0-9]+$/,'');
    })

    assert(indexNames, a1, 'fatal-183. Missing indexNames')

    indexNames.forEach((indexName, jj)=>{
      xi.push ({
//  	    item_id,
        indexName,
        titre_origine: (jj>0)? indexNames[0]:null,
        xid,
        yp,
//        name,
        links,
        auteurs,
        transcription,
        restricted
      });
    }); // an <article> can appear under different names (title) spelling, langues.
  }; // each article.

  xi.sort((a,b)=>{
    //console.log(`--${a.auteurName}`)
    return a.indexName.localeCompare(b.indexName)
  });

  console.log(`@847 leaving XI_titres (${xi.length})`)
  return xi;
} // XI_titres
