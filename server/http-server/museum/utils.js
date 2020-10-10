import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')

const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();


async function list_pages(o) {
  const verbose =1;
  const {path} = o;
  assert(path.startsWith('museum.md')) // minimum.

  const etime = new Date().getTime();
  const blueink = await postgres_connect();

  try {
    const data = await blueink.query(`
    select
       data->'indexNames' as indexNames,
       data->>'yp' as yp,
       (data->>'transcription')::boolean as transcription,
       (data->>'restricted')::boolean as restricted,
       data->>'xid' as xid,
       data->>'h1' as h1,
       data->'h2' as h2,
       (data->>'sec')::integer as sec
    from adoc.page, adoc.file
    where (file_id = id) and (path <@ $1)
    ;
    `,[path],{single:false})
  // console.log({data})
//  if (!o.db) db.instance.$pool.end();

  // now we can process the data.

    ;(verbose >0) && console.log(`@171 [${module.id}] found ${data.length} pages.`)

    return {data,
      etime: new Date().getTime() - etime
    }
  }


  catch(err) {
    throw err;
  }
} // list-pages


async function list_articles(o) {
  const verbose =1;
  const {path} = o;
  assert(path.startsWith('museum.md')) // minimum.

  const etime = new Date().getTime();

  /*
  if (!db) {
      console.log(`@120 INIT POSTGRES/BLUEINK CONNECTION`)
    db = await postgres_connect()
  }*/

  const blueink = await postgres_connect();

//  const db = await postgres_connect()
  try {
  const data = await blueink.query(`
    select
       data->'indexNames' as indexNames,
       data->'links' as links,
       data->>'yp' as yp,
       (data->>'transcription')::boolean as transcription,
       (data->>'restricted')::boolean as restricted,
       data->>'xid' as xid,
       data->'mk' as mk,
       data->'auteurs' as auteurs,
       data->>'h1' as h1,
       (data->>'sec')::integer as sec
    from adoc.page, adoc.file
    where (file_id = id) and (path <@ $1)
    -- and ((data->>'sec')::integer > 2)
    and (data->>'mk' is not null)
    -- order by data->>'yp'
    ;
    `,[path],{single:false})
  // console.log({data})
//  if (!o.db) db.instance.$pool.end();

  // now we can process the data.

  ;(verbose >0) && console.log(`@171 [${module.id}] found ${data.length} articles.`)

  return {data,
    etime: new Date().getTime() - etime
  }
} catch(err) {
  throw err;
}
} // list-articles


module.exports = {
  list_articles,
  list_pages
}
