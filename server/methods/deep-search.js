// R from 'ramda';
const nspell = require('../lib/nspell-vdico.js')

//import {db, package_id, _assert } from '../cms-api.js';
let db = null;
const {postgres_connect} = require('/server/lib/postgres-connect.js')

//const blueink_path = 'jpc'


async function search_v1(cmd) {
  const verbose =1;
  db = db || await postgres_connect();

  console.log(`deep-search@7 `,{cmd})
  let {vpath, query} = cmd;
  console.log(`@13: `,{vpath})
  const vdico = nspell.vdico();
  //console.log(`nspell.vdico:`,vdico);

  query = query.replace(/"/g,' ')
  const audit = [];

    // check if there is logical operators in the query, if so execute.
  if (query.match(/[<>\&\|]/)) {
    let etime = new Date().getTime();
//    const data = await db.tvec.search_pages_rank_cd2(vpath,query)
    const data = await db.adoc.search_pages_rank_cd2(vpath,query)
    etime = new Date().getTime() - etime;
    console.log(`q1:(${etime} ms.) ${data.length} results for: ${query}`)
    audit.push(`q1: (${etime} ms.) ${data.length} results for: ${query}`)
    return {etime, audit, pages: data}
  }
  // --- here, we don't have logic.

  const vq = query.split(' ');

  // try the phraseto_tsquery
  if (true) {
    const _query = vq.join('<->');
    let etime = new Date().getTime();
    (verbose>0) && console.log(`@32 alternate query:${_query}`)
//    const data = await db.tvec.search_pages_rank_cd2(vpath,_query)
    const data = await db.adoc.search_pages_rank_cd2(vpath,_query)
    etime = new Date().getTime() - etime;
    console.log(`q20:(${etime} ms.) ${data.length} results for: ${_query}`)
    audit.push(`q20: (${etime} ms.) ${data.length} results for: ${_query}`)
    if (data.length > 0) {
      return {etime, audit, pages: data}
    }
  }

  if (true) { // try suggestions same length ()<->()<->()
    const _query = vq.map(w => {
      if (w.length > 2)
        w =vdico[0].suggest(w).filter(it=>(it.length == w.length)).concat([w]).join(' | ')
      return `(${w})`;
    }).join('<->')
    let etime = new Date().getTime();
    (verbose>0) && console.log(`@49 alternate query:${_query}`)
//    const data = await db.tvec.search_pages_rank_cd2(vpath,_query)
    const data = await db.adoc.search_pages_rank_cd2(vpath,_query)
    etime = new Date().getTime() - etime;
    console.log(`q21:(${etime} ms.) ${data.length} results for: ${_query}`)
    audit.push(`q21: (${etime} ms.) ${data.length} results for: ${_query}`)
    if (data.length > 0) {
      return {etime, audit, pages: data}
    }
  }

  if (true) { // try suggestions same length ()<->()<->()
    const _query = vq.map(w => {
      if (w.length > 2)
        w =vdico[0].suggest(w)
              .filter(it=>((it.length <= w.length+1)&&(it.length >= w.length-1)))
              .concat([w]).join(' | ')
      return `(${w})`;
    }).join('<->')
    let etime = new Date().getTime();
    (verbose>0) && console.log(`@68 alternate query:${_query}`)
//    const data = await db.tvec.search_pages_rank_cd2(vpath,_query)
    const data = await db.adoc.search_pages_rank_cd2(vpath,_query)
    etime = new Date().getTime() - etime;
    console.log(`q22:(${etime} ms.) ${data.length} results for: ${_query}`)
    audit.push(`q22: (${etime} ms.) ${data.length} results for: ${_query}`)
    if (data.length > 0) {
      return {etime, audit, pages: data}
    }
  }

  // in & and | mode, ignore 1,2 letters words.
  const vq3 = vq.filter(it => (it.length>2));

  if (true) { // try the AND
    const _query = vq3.join(' & ');
    let etime = new Date().getTime();
    (verbose>0) && console.log(`@84 alternate query:${_query}`)
//    const data = await db.tvec.search_pages_rank_cd2(vpath,_query)
    const data = await db.adoc.search_pages_rank_cd2(vpath,_query)
    etime = new Date().getTime() - etime;
    console.log(`q30:(${etime} ms.) ${data.length} results for: ${_query}`)
    audit.push(`q30: (${etime} ms.) ${data.length} results for: ${_query}`)
    if (data.length > 0) {
      return {etime, audit, pages: data}
    }
  }

  if (true) { // try the AND
    const _query = vq3.join(' | ');
    let etime = new Date().getTime();
    (verbose>0) && console.log(`@97 alternate query:${_query}`)
//    const data = await db.tvec.search_pages_rank_cd2(vpath,_query)
    const data = await db.adoc.search_pages_rank_cd2(vpath,_query)
    etime = new Date().getTime() - etime;
    console.log(`q40:(${etime} ms.) ${data.length} results for: ${_query}`)
    audit.push(`q40: (${etime} ms.) ${data.length} results for: ${_query}`)
//    if (data.length > 0) {
      return {etime, audit, pages: data}
//    }
  }
}

Meteor.methods({
  'deep-search': (cmd) =>{
    return search_v1(cmd);
  }
})
