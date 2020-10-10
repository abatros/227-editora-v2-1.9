// R from 'ramda';
const nspell = require('../lib/nspell-vdico.js')

//import {db, package_id, _assert } from '../cms-api.js';
let db = null;
const {postgres_connect} = require('/server/lib/postgres-connect.js')

//const blueink_path = 'jpc'


Meteor.methods({
  'find-files': (cmd) =>{
    const {query,path} = cmd;
    if (!path) {
      return {
        error: '@16 Incorrect parameters',
        params:cmd
      }
    }
    return find_files(cmd);
  }
})


async function find_files(cmd, options={}) {
  const verbose =1;
  const audit = [];
  const {recurse} = options;

  const _etime = new Date().getTime();

  db = db || await postgres_connect();

  ;(verbose >0) && console.log(`@29 find-files `,{cmd})
  let {path:vpath, query} = cmd;
  ;(verbose >0) && console.log(`@30 find-files`,{vpath},{query})
//  const vdico = nspell.vdico();
  //console.log(`nspell.vdico:`,vdico);

  let ltree = await db.query(`
    select distinct subpath(path,0,2) from adoc.file
    where path <@ $1;
    `,[vpath], {single:false})
  ltree = ltree.map(it=> it.subpath);

  if (!query || query =='') {
    console.log(`@36 [${module.id}] <${query}>@<${vpath}>`,{cmd})
    return {list:[], ltree}
  }

  if (query.trim().startsWith('*')) {
    let sql_query = `
      select *
      from adoc.file
      where (path ~ $1);
      ;`
    const list = await db.query(sql_query, [vpath, query],{single:false});
    return {list, ltree}

  }

  // >girardot => starting with ... default : look everywhere in the (xid)
  if (query.startsWith('>')) {
    query = query.substring(1).trim()+'%'
  } else {
    query = '%'+query.trim()+'%'
  }


  let sql_query = `
    select *
    from adoc.file
    where (path ~ $1)
    and (xid ilike $2)
    ;`

  if (recurse) {
    sql_query = `
      select *
      from adoc.file
      where (path <@ $1)
      and (xid ilike $2)
      ;`
  }

  const data = await db.query(sql_query, [vpath, query],{single:false});




  const etime = new Date().getTime() - _etime;
  console.log(`@54 (${etime} ms.) ${data.length} results for: ${query}`)
///    audit.push(`q40: (${etime} ms.) ${data.length} results for: ${_query}`)

  console.log({data})
  console.log({ltree})

  return {list:data, ltree}
}
