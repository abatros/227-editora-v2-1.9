import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';

import { WebApp } from 'meteor/webapp';
WebApp.connectHandlers.use('/museum/index-pages', index_pages);

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
const {list_pages} = require('./utils.js')


const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();

// ---------------------------------------------------------------------------

/***************************************************

  all pages for c1, c2, a3, a4  (catalogs and articles)

****************************************************/

async function index_pages(req, res) {
  const verbose =1;
  const etime_ = new Date().getTime();
  const audit =[];

  const retv1 = await s3.getObjectMetadata('s3://museum/index-pages.json')
  audit.push({etime:new Date().getTime()-etime_, label:`getObjectMetadata(pages)`})
  console.log(`@678 `,{retv1})


  if (!retv1.ETag) {
    console.log(`@682 `,{retv1})
    const {data:xlsx, error} = await list_pages({path:'museum.md'}) // all
    ;(verbose >0) && console.log(`@389 [${module.id}] found ${xlsx.length} pages.`)
    audit.push(`${new Date().getTime()-etime_} list-pages (${xlsx.length})`)

    /**********************************************

    we need a list of pages with yp, title, and link to html

    ***********************************************/

    let index = xlsx.map(a1 =>{
  //    console.log(`-- `,a1)
      const {item_id, xid, yp, h1,
        h2, // array
               //transcription, restricted,
        indexNames=['*missing*']} = a1;

      const xid_ = extend_xid_museum(h1)

      const a2 = Object.assign({}, {item_id, xid, yp, h1,
        h2: h2?h2[0]:"h2-missing",
        indexName:indexNames[0], xid_})

        console.log({a2})
      return a2;
    })

    index.sort((a,b) => (''+a.xid).localeCompare(''+b.xid))


    index = JSON.stringify(index, null, ' ');
    const retv2 = await s3.putObject('s3://museum/index-pages.json', index);
    audit.push({etime:new Date().getTime()-etime_, label:`putObject(index-pages)`})


    res.status(200)
      .end(`index-pages ${index.length} entries has been updated.
        Please retry preferably using [F5] key.
        ${JSON.stringify(retv2)}
        `)

    return;

  }


  const html = await Assets.getText('views/museum/index-pages.html');
  audit.push({etime:new Date().getTime()-etime_, label:`Asset.getText`})

  res.status(200).end(html)
  audit.push({etime:new Date().getTime()-etime_, label:`sending`})

  console.log(`@644 audit (index-titres):\n`,
    audit.map((it,j) =>{
      const _etime = (j>0)? it.etime - audit[j-1].etime: it.etime;
      return `-- ${it.etime} [${_etime}] ${it.label}`;
    }).join('\n'))


} // index-pages

// --------------------------------------------------------------------------

function extend_xid_museum(indexName) {
  indexName = indexName.replace(/[\s,\(\)\-\'\:\?\’\°]+/g,' ')
      .replace(/\./g,'')
      .trim()
      .replace(/\s+/g,'-').toLowerCase()
  const v = indexName.split('-').filter(it=>(it.length>1))
  const v2 =[]; let acc=0;
  for (it of v) {
    v2.push(it)
    acc += it.length;
//      console.log(`@149 ${acc}`)
    if (acc>40) break;
  }
  return v2.join('-')
}
