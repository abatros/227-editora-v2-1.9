import { WebApp } from 'meteor/webapp';

/****************************

  for a3,a4. (titres)

*****************************/

WebApp.connectHandlers.use('/museum/index-auteurs', index_auteurs);

import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
const {list_articles} = require('./utils.js')


const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();


async function index_auteurs(req, res) {
  const verbose =0;
  const etime_ = new Date().getTime();
  const audit =[];

  const retv1 = await s3.getObjectMetadata('s3://museum/index-auteurs.json')
  audit.push({etime:new Date().getTime()-etime_, label:`getObjectMetadata(auteurs)`})
  console.log(`@678 `,{retv1})

  if (!retv1.ETag) {
    const ix = await rebuild_index_auteurs('.json');
    console.log(`@682 auteurs ${ix.length}`)
    const data = JSON.stringify(ix,null,' ');

    const retv2 = await s3.putObject('s3://museum/index-auteurs.json',data)
    audit.push({etime:new Date().getTime()-etime_, label:`putObject(auteurs.json)`})


    res.status(200).end(`updating index-auteurs.
      Please refresh your browser - preferably using [F5] key.`)

    return;
  }

  const html = await Assets.getText('views/museum/index-auteurs.html');
  audit.push({etime:new Date().getTime()-etime_, label:`Asset.getText`})

  res.status(200).end(html)
  audit.push({etime:new Date().getTime()-etime_, label:`sending`})

  console.log(`@644 audit (index-auteurs):\n`,
    audit.map((it,j) =>{
      const _etime = (j>0)? it.etime - audit[j-1].etime: it.etime;
      return `-- ${it.etime} [${_etime}] ${it.label}`;
    }).join('\n'))
} // index_auteurs


async function rebuild_index_auteurs() {
  const verbose =0;
  const retv1 = await list_articles({path:'museum.md.a'})
  ;(verbose >0) && console.log(`@186 [${module.id}] found ${retv1.data.length} articles.`)

//  console.log({data})

  const alist = XI_auteurs(retv1.data)
  ;(verbose >0) && console.log({alist})
  ;(verbose >0) && console.log(`@718 alist:${alist.length}`)


  const y = alist.map(({auteur:auteurName, articles:titres})=>{
    if (!titres || titres.length <1) {
          titres.push({
            fn:"TRANSCRIPTIONx"
          })
          throw 'stop-24'
    } else {
      if (!Array.isArray(titres)) {
        console.error(titres); throw 'fatal-29'
      }

      titres.forEach(titre=>{
        titre.links.forEach((pdf)=>{
          pdf.fn2 = pdf.fn
          .replace(/^[0-9\s]*\s*/,'')
          .replace(/[\s\-]*[0-9]+$/,'');
        })
      })
    };

    titres.sort((a,b)=>(a.yp.localeCompare(b.yp)));

    return {
      auteurName,
      titres
    };
  }); // map




  if (true) {
    y.sort((a,b)=>{
          //console.log(`--${a.auteurName}`)
      return a.auteurName.localeCompare(b.auteurName)
    });
  }

  ;(verbose >0) && console.log(`@759 y:${y.length}`)
  return y;

} // rebuild_index_auteurs



function XI_auteurs(xlsx) {
  const verbose =0;
  const _au = {}
  let mCount = 0;
  for (const xe of xlsx) {
    const {xid, yp, indexnames:indexNames, auteurs, links, transcription, restricted} = xe;
    // each xlsx-entry can generate multiple entry in marques.

    if (!indexNames || !auteurs) {
      console.error(`@328 fatal:`,{xe})
      process.exit(-1)
    }

//    console.log(`@332 fatal:`,{indexnames})

    const _auteurs = auteurs.map(j=>(j.trim())).filter(j=>(j.length>0)); // FIX.

    if (!_auteurs || (_auteurs.length<1)) {
      notice(`j:${j} titre:${JSON.stringify(indexNames)}`);
      mCount++;
      notice (`mapp_index_byMarques =>fatal title without marque xid:${xid} ${mCount}/${j}`);
      continue;
    }
  //  notice(titre.sec);


    _auteurs.forEach((au1)=>{
      if (au1.length<1) throw `fatal-65`;
      if (au1.trim().length<1) throw `fatal-66`;
      _au[au1] = _au[au1] || [];

      _au[au1].push({
        h1 : indexNames[0],
  	    xid,
  	    yp,
  	    links, // pdf
  	    transcription,
  	    restricted
  	  })
    });
  }; // loop.


  const alist = Object.keys(_au).map(au1 => ({
      auteur: au1 || '*null*',		// marque === iName
  //    nc: marques[mk1].length,
      articles: _au[au1]	// list of catalogs.
  }))
  .sort((a,b) =>{
    if (a.auteur < b.auteur) return -1;
    if (a.auteur > b.auteur) return 1;
    return 0;
  });

  return alist;
}
