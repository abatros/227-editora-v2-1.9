import { WebApp } from 'meteor/webapp';

/****************************

  for a3,a4. (titres)

*****************************/

WebApp.connectHandlers.use('/museum-api/index-marques', index_marques);

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


async function index_marques(req, res) {
  const verbose =0;
  const etime_ = new Date().getTime();
  const audit =[];

  const retv1 = await s3.getObjectMetadata('s3://museum/index-marques.json')
  audit.push({etime:new Date().getTime()-etime_, label:`getObjectMetadata`})

  if (!retv1.ETag) {
    let {list} = await rebuild_index_marques();
    audit.push({etime:new Date().getTime()-etime_, label:`rebuild ${list.length} entries`})

    list = JSON.stringify(list,null,' ');
    const retv2 = await s3.putObject('s3://museum/index-marques.json', list);
    audit.push({etime:new Date().getTime()-etime_, label:`putObject`})

    res.status(200).end(`updating index-marques.
      Please refresh your browser - preferably using [F5] key.`)
    return;
  }


  const html = await Assets.getText('views/museum/index-marques.html');
  audit.push({etime:new Date().getTime()-etime_, label:`Asset.getText`})
  if (!html) {
    throw 'fatal@53 missing template index-marques.'
  }

  res.status(200).end(html)
  audit.push({etime:new Date().getTime()-etime_, label:`sending`})

  console.log(`@644 audit (index-marques-handlebars):\n`,
    audit.map((it,j) =>{
      const _etime = (j>0)? it.etime - audit[j-1].etime: it.etime;
      return `-- ${it.etime} [${_etime}] ${it.label}`;
    }).join('\n'))

} // index-marques



let index_marques_compiled =null;

async function rebuild_index_marques() {
  const verbose =0;
  const audit =[];
  const etime_ = new Date().getTime();


  const retv1 = await list_articles({path:'museum.md.c'})
  ;(verbose >0) && console.log(`@389 [${module.id}] found ${retv1.data.length} articles.`)

  audit.push(`${new Date().getTime()-etime_} list-articles (${retv1.data.length})`)

  const mlist = extract_marques(retv1.data)
  ;(verbose >0) && console.log({mlist})

  audit.push(`${new Date().getTime()-etime_} after extract-marques`)

  const g = reformat_marques(mlist)
//    const y = await reformat(index)
  audit.push(`${new Date().getTime()-etime_} after reformat`)

  const na = g.next()
  console.log(`@84: reformat-1 na:`,na.value)
//    Session.set('wait-message',`got ${retv.index.length} results`)
  g.next()
  console.log(`@84: reformat-2`)
//    Session.set('wait-message',`compiling ${retv.index.length} results`)
  const {value:y, done} = g.next()
//    Session.set('wait-message',`sorting ${retv.index.length} results`)
  console.log(`@84: reformat-3 (done:${done}) y:${y.length}`)

  audit.push(`${new Date().getTime()-etime_} before rendering`)

  if (false) {
    y.sort((a,b)=>{
      //console.log(`--${a.auteurName}`)
      return a.marque.localeCompare(b.marque)
    });

  }

  return {list:y};
}

function extract_marques(articles) { // 1-1 relation with xlsx
  const verbose =0;
  const marques = {}
  let mCount = 0;
  for (const a1 of articles) {
    const {xid, yp, indexnames:indexNames, mk, links, transcription, restricted} = a1;
    // each xlsx-entry can generate multiple entry in marques.

    if (!indexNames || !mk) {
      console.log(`@328 fatal:`,{xe})
      process.exit(-1)
    }

//    console.log(`@332 fatal:`,{indexnames})

    const _mk = mk.map(mk1=>(mk1.trim())).filter(mk1=>(mk1.length>0)); // FIX.

    if (!mk || (mk.length<1)) {
      notice(`j:${j} titre:${JSON.stringify(indexNames)}`);
      mCount++;
      notice (`mapp_index_byMarques =>fatal title without marque xid:${xid} ${mCount}/${j}`);
      continue;
    }
  //  notice(titre.sec);


    _mk.forEach((mk1)=>{
      if (mk1.length<1) throw `fatal-65`;
      if (mk1.trim().length<1) throw `fatal-66`;
      marques[mk1] = marques[mk1] || [];

      marques[mk1].push({
        title : indexNames[0],
  	    xid,
  	    yp,
  	    links, // pdf
  	    transcription,
  	    restricted
  	  })
    });
  }; // loop.


  const mlist = Object.keys(marques).map(mk1 => ({
      marque: mk1 || '*null*',		// marque === iName
  //    nc: marques[mk1].length,
      articles: marques[mk1]	// list of catalogs.
  }));

  return mlist;
} // extract marques



function *reformat_marques(index) {
  yield index.length;

  const y = index.map(({marque, articles:titres})=>{
    //console.log(`@27: `,marque)
    if (!titres || titres.length <1) {
      titres.push({fn:"TRANSCRIPTIONx"})
      throw 'stop-24'
    } else {
      if (!Array.isArray(titres)) {
        console.log(titres);
        throw 'fatal-29 Not an array.'
      }

      titres.forEach(titre=>{
        titre.links.forEach((pdf)=>{
          pdf.fn2 = pdf.fn
          .replace(/^[0-9\s]*\s*/,'')
          .replace(/[\s\-]*[0-9]+$/,'');
        })
      })

      titres.sort((a,b)=>(a.yp.localeCompare(b.yp)));
    };

    return {
      marque,
      titres
    };
  });

  yield y;

  if (false) {
    console.log(`@44: got ${y.length} entries - sorting...`)
    y.sort((a,b)=>{
      //console.log(`--${a.auteurName}`)
      return a.marque.localeCompare(b.marque)
    });
  }

  console.log(`@44: got ${y.length} entries - done`)

  return y;
}
