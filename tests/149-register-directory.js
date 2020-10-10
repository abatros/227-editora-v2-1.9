#! /usr/bin/env node

const fs = require('fs')
const assert = require('assert')
const yaml = require('js-yaml')
const path = require('path')
const s3 = require('../server/lib/aws-s3.js')(process.env); // for s3-Keys
const {parse_s3filename, extract_metadata} = require('../shared/utils.js')

const {postgres_connect} = require('../server/lib/postgres-connect.js')
let db =null;
/**************************************

for each file in a s3-folder,
create or update (adoc.dir - adoc.file).

***************************************/

const s3dir = 's3://museum-2020/';
//const pagex_path = 'dkz.yellow';

const {Bucket,Key} = parse_s3filename(s3dir)

const h = {};

main();

async function main() {
  db = await postgres_connect();

  const {Contents, Prefix, CommonPrefixes:dir} = await get_directory(s3dir)

  const {path:pagex_path, code} = await get_publish_env(s3dir);
  assert(pagex_path, `@34 path-not-found code:${code}`);


  for (it of Contents) {
    const {dir,base} = path.parse(it.Key)
    console.log(`-- `,it.Key)

    /***************************************************************

    the file should already exist.
    We just fill (dir,name) columns.
    <name> := <xid> + '.md'
    <dir> :=

    ****************************************************************/

    if (base.toLowerCase().endsWith('.md')) {
      console.log(`-- `, it)
      const retv1 = await register_file(Bucket, it.Key, pagex_path)
      break;
    }
  } // each in Contents
} // main



// --------------------------------------------------------------------------

async function register_file(Bucket, Key, pagex_path) {
  assert(Bucket); assert(Key);

  /*******************************************
    step 1: get the file from s3://bucket
    for what ????
  ********************************************/

  const retv1 = await s3.getObject({Bucket,Key})
  console.log(retv1)


  const {dir, base:fname, name:xid, ext} = path.parse(Key);
  const s3dir = 's3://' + path.join(Bucket, dir)

  console.log(`file <${s3dir}><${fname}>`)

  /*******************************************
    step 2: create dir-entry
  ********************************************/

  if (!h[s3dir]) {
    const {new_dir_entry:id} = await register_dir(s3dir);
    h[s3dir] = id;
  }

  /*******************************************
    step 3: update (dir,name) in adoc.file
  ********************************************/

  const id = h[s3dir];

  if (true) {
    const retv2 = await db.query(`
      select * from adoc.file
      where path <@ $1
      and xid = $2;
      `,[pagex_path, xid],{single:true})

    console.log({retv2})
  }


return;


const retv3 = await db.query(`
  update adoc.file f
  set (dir,name) = ($1,$2)
  where (f.path = $3) and (f.xid = $4);
  `,[id,fname,pagex_path,xid]);

console.log({retv3})
//  return retv2[0];




}


async function register_dir(dirName) {
  const retv = await db.adoc.new_dir_entry(dirName)
  console.log(`ADDING DIRECTORY <${dirName}>`,{retv})
  return retv[0];
}

async function get_directory(s3dir) {
  const {Bucket,Key:Prefix} = parse_s3filename(s3dir)
  console.log({Bucket},{Prefix})
  const retv1 = await s3.readdir_nofix({
    Bucket,
    Prefix,
    Delimiter: '/'
  });
  console.log(`@357 readdir =>`,retv1)

  return retv1
}

async function get_publish_env(s3dir) {
  const {Bucket,Key} = parse_s3filename(s3dir)
  const retv1 = await s3.getObject({
    Bucket,
    Key: path.join(Key,'.publish.yaml'),
  });
  console.log(`@145 getObject =>`,retv1)
  if (!retv1.data) return retv1;

  const meta = yaml.safeLoad(retv1.data)
  console.log(`@149 `,{meta})
//  if (retv1.code == 'KeyNotFound') Object.assign(retv1,{})
  return meta
}
