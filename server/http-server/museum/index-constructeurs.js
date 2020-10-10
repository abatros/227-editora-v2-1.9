import { WebApp } from 'meteor/webapp';

/****************************

  for a3,a4. (titres)

*****************************/

WebApp.connectHandlers.use('/museum/index-constructeurs', index_constructeurs);

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

async function index_constructeurs(req, res) {
  const verbose =1;
  const etime_ = new Date().getTime();
  const audit =[];

  /*************************************************

    if json file does not exist on s3://museum => rebuild.

  **************************************************/


  const retv1 = await s3.getObjectMetadata('s3://museum/index-constructeurs.json')
  audit.push({etime:new Date().getTime()-etime_, label:`getObjectMetadata(constructeurs)`})
  console.log(`@678 `,{retv1})



  if (!retv1.ETag) {
    rebuild_index_constructeurs('.json');

    res.status(200).end(`updating index-constructers.
      Please refresh your browser - preferably using [F5] key.`)

    return;
  }


  const html = await Assets.getText('views/museum/index-constructeurs.html');
  audit.push({etime:new Date().getTime()-etime_, label:`Asset.getText`})

  res.status(200).end(html)
  audit.push({etime:new Date().getTime()-etime_, label:`sending`})

  console.log(`@644 audit (index-constructeurs):\n`,
    audit.map((it,j) =>{
      const _etime = (j>0)? it.etime - audit[j-1].etime: it.etime;
      return `-- ${it.etime} [${_etime}] ${it.label}`;
    }).join('\n'))


} // index-constructeurs


async function rebuild_index_constructeurs (ext) {
  const etime_ = new Date().getTime();
  const audit =[];
  const {data:xlsx, error} = await list_articles({path:'museum.md.c'})
  ;(verbose >0) && console.log(`@389 [${module.id}] found ${xlsx.length} articles.`)
  audit.push(`${new Date().getTime()-etime_} list-articles (${xlsx.length})`)


  await fix_constructeurs(xlsx);
  audit.push({etime:new Date().getTime()-etime_, label:`rebuild ${xlsx.length} constructeurs`})

  const xi = XI_constructeurs(xlsx);
  audit.push({etime:new Date().getTime()-etime_, label:`XI`})

  const data = JSON.stringify(xi,null,' ');

  if (ext == '.json') {
    const retv2 = await s3.putObject('s3://museum/index-constructeurs.json', data);
    audit.push({etime:new Date().getTime()-etime_, label:`putObject(constructeurs)`})
    return data;
  }

  if (ext == '.js') {
    const jsCode = `
      var index_constructeurs = ${data};
    `
    const retv2 = await s3.putObject('s3://museum/index-constructeurs.js', jsCode);
    audit.push({etime:new Date().getTime()-etime_, label:`putObject(constructeurs)`})
    return jsCode;
  }

  throw '@743 Invalid extension'

}


/*

        xi: a list of constructeurs.
        For each constructeur, all articles/catalogs ordered by yp.

*/

function XI_constructeurs(articles) {
  const xi = {} // Inverted Index -- for constructor legalName (indexName) and all acronyms => list of catalogs.
  let mCount = 0;

  for (const article of articles) {
    const {item_id, xid, yp, name, h1, title, links, transcription, restricted, indexnames:indexNames} = article;

console.log(`@764 `,{article})

    assert((indexNames && indexNames.length>0));

    indexNames.forEach((cname, ia)=>{
      if (cname.length<1) throw `fatal-65`;
      if (cname.trim().length<1) throw `fatal-66`;
      xi[cname] = xi[cname] || {
        indexName: cname, // constructeur
        voir_legalName: ((cname != indexNames[0])? indexNames[0] : null),
        articles:[]
      }
      xi[cname].articles.push({
//  	    item_id, should be revision
        h1,
//        title,    // first of indexNames for article.title
        xid,      // debug
        yp,
        name,
        links,
        transcription,
        restricted
      })
    }); // each aka
  }; // each article.

  return Object.values(xi)
  .sort((a,b)=>{
    return a.indexName.localeCompare(b.indexName)
  });
}


function fix_constructeurs(xlsx) {
  xlsx.forEach((a1,j) =>{ // Catalogs ( from Construteurs)
    if (!a1.indexnames) {fatal$42(a1, 'missing indexNames');}
//      a1.indexNames = a1.indexNames.map(ti=>(ti.trim())).filter(ti=>(ti.length>0)); // FIX.
    if (!a1.links || a1.links.length<1) {
//        a1.links.push({fn2:"TRANSCRIPTION"})
    } else {
      // tp.data_status.set(`reformatting ${j}`); // does nothing.!!!
      a1.links.forEach((pdf)=>{
        pdf.fn2 = pdf.fn
        .replace(/^[0-9\s]*\s*/,'') // remove 'ca' !!!!
        .replace(/[\s\-]*[0-9]+$/,'');
      })
    }
  }) // each cc.
}
