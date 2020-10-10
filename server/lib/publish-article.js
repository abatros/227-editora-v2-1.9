const path = require('path')
const assert = require('assert')
const yaml = require('js-yaml')
const s3 = require('./aws-s3.js')();
const cheerio = require('cheerio')

const {parse_s3filename, extract_metadata} = require('/shared/utils.js')
const utils = require('./utils.js')
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')

//const util2 = require('/shared/utils.js')

/*
const fs = require('fs-extra');
const Massive = require('massive');
const monitor = require('pg-monitor');
require ('./methods/deep-search.js')
require ('./methods/refresh-web-page.js')
require ('./methods.js')
import {fix_folder_v2, fix_md_mime_type, migration_v1} from './lib/utils.js'

*/

module.exports = publish_article;

async function publish_article(cmd) {
  const verbose =1;

  try {
    const {s3_url, update} = cmd;
    let {data} = cmd; // if no data we must fetch

    ;(verbose>=0) &&
      console.log(`@194 [${module.id}] Meteor.method publish-s3data (${s3_url}) data.length:${data && data.length}`)

    if (!s3_url) throw new Meteor.Error('sys-error','','@196 publish-s3data : missing s3_url');

    const {Bucket, Key, subsite, xid, base, ext} = parse_s3filename(s3_url)

    if (ext != '.md') {
      throw Meteor.Error('Not a md-file @40')
    }


    if (!data) {
      const retv = await s3.getObject(s3_url)
      const {data:data_,error} = retv;
      if (error) {
        console.error(`@232 getObject(${s3_url}) =>`,retv)
        return {error, s3_url}
      }
      data = data_;
    }

    /**********************************************************

      Extract metadata from MD-file

    ***********************************************************/

    const {meta:meta_, md, err} = extract_metadata(data);
    ;(verbose >1) && console.log(`@214 md.length:${md && md.length} `,{meta},{err})

    const meta = meta_ || {};
    if (!meta) {
      console.log(`@331 missing meta`)
      throw 'fatal@241'
    }

    /***********************************************************

    Read metadata to decide howto publish - what to publish

    ************************************************************/

    if (meta.doctype == 'e3element') {
      return publish_e3element(s3_url,meta,md); // promise
      console.log(`todo@76 process e3element`)
      throw 'todo@76'
    }


    if (meta.doctype == 'chicros') {
      const publish_chicros_master = require('./publish-chicros-master.js')
      // find the master : replace '103-shopping-cart.md' by 'master.html'
      const {dir} = path.parse(Key);
      const master_s3fn = path.join(Bucket,dir,'master.html');

      return publish_chicros_master(master_s3fn); // promise
    }

    if (meta.doctype == 'dataset-item') {
      /***************************************
        item for a dataset at the parent-level.
        Rebuild the page : need to skip 2 folders level
      ****************************************/

      const publish_chicros_master = require('./publish-chicros-master.js')
      // find the master : replace '103-shopping-cart.md' by 'master.html'
      const {dir:dir1} = path.parse(Key);
      const {dir} = path.parse(dir1);
      const master_s3fn = path.join(Bucket,dir,'master.html');

      return publish_chicros_master(master_s3fn); // promise
    }



    /**********************************************************

      Get config from .publish.yaml (if not specified)

    ***********************************************************/

    assert(Bucket);
    assert(subsite);

    const yaml_fn = path.join(Bucket,subsite,'.publish.yaml')
    ;(verbose >=0) && console.log(`@227 [${module.id}] lookup config <${yaml_fn}>`)

    const default_publish_cfg = {
      pg: 'ultimheat.com:5434/blueink',
      path: 'caltek',
      format: 'yellow-book',
      _output: 's3://abatros/projects',
      _template: 's3://publibase/yellow/yellow-page-template-v1.html-template',
      _hrefPrefix: '/projects',
    };

    //let {data:publish_cfg} = await utils.get_yaml_object(yaml_fn);

    const retv1 = await s3.getObject(yaml_fn);
    assert(retv1.Body) // config MUST exist.
    if (!retv1.data) {
      console.log(`@109 `,{retv1})
    }
//    let publish_cfg = yaml.safeLoad(retv1.Body.toString('utf8'),'utf8')
    let publish_cfg = yaml.safeLoad(retv1.data,'utf8')

    publish_cfg = publish_cfg || default_publish_cfg
    ;(verbose>1) && console.log(`@228: `,{publish_cfg})

    if (!publish_cfg) {
      console.error(`@276 [${module.id}] config <${yaml_fn}> empty`)
      throw `Missing config file (.publish.yaml)`
    }


    /*****************************************************************

      Get Template (if not defined)

    ******************************************************************/

    const {template:template_fn} = publish_cfg;
    if (!template_fn) {
      console.error(`@282 missing template property in `,{publish_cfg})
      throw Meteor.Error('@282 missing template property')
    }
    ;(verbose >=0) && console.log(`@282 [${module.id}] using template <${template_fn}>`)


    /*****************************************************************

      Get custom processing (if not defined)

    ******************************************************************/
    if (!publish_cfg.format) {
      console.error('Undefined format: ',{publish_cfg})
      return {error: 'Undefined format'}
    }

    const custom = utils.setCustom(publish_cfg.format)
    if (!custom) throw `mk_html not-found for <${publish_cfg.format}>`

    const {mk_html,
//      commit_ts_vector,
      scan_e3live_data,
      mk_h1_html,
      deeps_headline // to make link/title in deeps results.
    } = custom;
    assert(mk_html, `Missing-hook mk_html`)
    assert(scan_e3live_data, `Missing-hook scan_e3live_data`)
    assert(deeps_headline, `Missing-hook deeps_headline`)
//    assert(commit_ts_vector, `Missing-hook commit_ts_vector`)
//      assert(mk_h1_html, `Missing-hook mk_h1_html`)


    ;(verbose >=0) && console.log(`@300 [${module.id}] metadata:`,meta)
    assert(subsite, `@284 Missing subsite`)
    assert(xid, `@285 Missing xid`)
    assert(template_fn, `@285 Missing template_fn`)

    /*****************************************************************

      Make HTML code.

    ******************************************************************/

    const {html} = await custom.mk_html({
      meta,md,s3_url,
      Bucket, subsite, xid,
      template_fn,
      cache_disabled: true,
    })
    ;(verbose >1) && console.log(`@110 `,{html})
    ;(verbose >0) && console.log(`@293 html.length:${html.length}`)


    /*****************************************************************

      write HTML code.

    ******************************************************************/

    async function write_html() {
      const verbose =1;
      const {dir,name} = path.parse(Key)
//        const html_fn = path.join(Bucket,dir,name,'index.html')
      const html_fn = path.join(Bucket,dir,name)

      ;(verbose >0) && console.log(`-------------------\n@290 writing-html on <s3://${html_fn}>...`)

      //utils.putObject({s3_url:html_fn, data:html}); // MD-code

      const p = {
        Bucket,
        Key: path.join(dir,name),
        ContentType: 'text/html;charset=utf8', // because no extension
        ACL: 'public-read'
      };

      ;(verbose >0) && console.log(`@289 write html `,p)

      const retv3 = await s3.putObject(Object.assign(p,{data:html}))
      ;(verbose >=0) && console.log(`@290 writing <${html_fn}> ETag:<${retv3.ETag}>`)
    }

    await write_html();

    // ------------------------------------------------------------------

    /****************************************************************

      Parse HTML code => meta-tags and raw-text

        scan HTML to extract raw_text and metadata
        metadata are stored in blueink.page.data (jsonb)
        except: path::ltree, xid, pageNo

        path : if not found in article metadata, defaults to publish.yaml.path

    ******************************************************************/

    const {meta_tags, raw_text} = scan_e3live_data(html)
    ;(verbose >1) && console.log(`@218 `,{meta_tags},{raw_text})

    if (!publish_cfg) {
      console.log(`@331 missing publish-cfg`)
    }

    if (!meta) {
      console.log(`@331 missing meta`)
    }

    if (!meta.path && !publish_cfg.path) {
      console.log(`@333 `,{meta},{publish_cfg})
    }

    const meta_path = meta.path || publish_cfg.path;
    assert(meta_path, `@224 Missing path.`)


    /*****************************************************************

      Prep a record for blueink.pagex

    ******************************************************************/

    const pageNo =0;

    // this also should be custom-code
    const diams = ' &diams; '
//      const diams = ' &loz; '
    meta.abs = meta.abs && meta.abs.replace(/\n/g,diams).replace(/\s+/g,' ').trim();

    // that is specific to each publication !!!!

    const raw_text_ = (meta_tags.h1 || '') + diams + (meta.abs || raw_text);

    /*
        root-url => to replace Bucket.
    */
    const root_url = publish_cfg['root-url'];
    if (!root_url) {
      console.log(`@416 publish_cfg (${yaml_fn}):`,{publish_cfg})
      throw 'fatal@416 Missing root-url'
    }

    //;(verbose >0) &&
    console.log(`@418 `,{root_url},{Bucket},{Key},{subsite},{xid})
    assert(Key.endsWith('.md')); // could be ".tex"


//      const url = util2.s3fn_to_url(s3_url)
    const url = `${root_url}/${xid}`;
    const h1_html = custom.deeps_headline({url,xid,title:meta_tags.h1, meta_tags, s3_url, meta, path:meta_path})

    assert(s3_url);

    const ts_data = Object.assign(meta_tags, {
      url,
      h1_html, // temporary
      index_title: h1_html,
      s3fn: s3_url,
    })

    /*****************************************************************

      Write a record into blueink.pagex

    ******************************************************************/

    if (!db) {
        console.log(`@120 INIT POSTGRES/BLUEINK CONNECTION`)
      db = await postgres_connect()
    }

    const retv = await db.adoc.write_pagex(meta_path, xid, pageNo, ts_data, raw_text_);
    ;(verbose >=0) &&
    console.log(`@414 [${module.id}] write_pagex => `,{retv})
    console.log(`@414 [${module.id}] write_pagex => `,{meta_path},{xid},{ts_data})

    const {VersionId, ETag, LastModified} = retv;

    return {
      error:null,
      data: {
        VersionId, ETag, LastModified
      }
      // VersionId
    }
  }
  catch(err) {
    console.error(`@349 Method:publish-s3data catch =>`,err)
    throw err;
  }
} // publish-article

// --------------------------------------------------------------------------

/*

      Insert e3element into parent html-page
      then send to bucket, and update pagex.

*/

async function publish_e3element(s3fn, meta, md) {
  const verbose =1;
  assert (meta.doctype == 'e3element');
  assert (typeof s3fn == 'string')

  // md can be pure html or MD-code.
  // lets assume pure html. => no need for renderer

  /***************************************************

    find the parent html page

  ****************************************************/

  const {Bucket, Key:Key_} = parse_s3filename(s3fn)
  const {dir, name:xid, base, ext} = path.parse(Key_)
  const Key = dir + '.html'; // one way. check
  const retv1 = await s3.getObject({Bucket,Key})

  const {ETag, VersionId} = retv1;
  let {data:html} = retv1;
  ;(verbose >0) && console.log(`@343 <${Bucket}><${Key}> xid:${xid} `, {ETag, VersionId});

  if (!ETag || !html || !xid) {
    const error = `@384 <${Bucket}><${Key}> file-not-found`
    console.error(error);
    throw error; // or return error...
  }


  /***************************************************

    cheerio-scan and build index of all js-e3article
    (optional)

  ****************************************************/

  const $ = cheerio.load(html);

  if (true) {
    const v = $('div.js-e3article');
    v.each((j,it) =>{
      console.log(`@367 `,it.attribs)
    })

  }



  /***************************************************

    cheerio-scan and locate the component.

  ****************************************************/

//  const a = $('body').find(`#${ai}`)
  const selector = `div#${xid}`;
  const v = $(selector); // only 1 article should have that ID...
  console.log(`@363: extract_html for xid:${xid} ${v.length}`)
  if (v && v.length > 1) {
    console.log('@437:',v)
    throw `xid:${xid} multiple (${v.length}) hits in <${s3fn}>`
  }
  if (!v || v.length != 1) {
    throw `xid:${xid} not found in <${s3fn}>`
  }
  const tagName = v[0].name; console.log({tagName})
//  return {tagName, html: ($(v[0]).html() || '').replace(/^[\s]*/gm,'')};


  console.log({tagName},$(v[0]).html())

  /***************************************************

    cheerio empty and replace the component.

  ****************************************************/


//  $(v[0]).remove();
  $(v[0]).empty();
  $(v[0]).append(md);

  //console.log($.html())

  /***************************************************

    write the page back to s3://bucket

  ****************************************************/

  html = $.html();

  const params = {
    Bucket,
    Key,
    ACL: 'public-read',
    ContentType: 'text/html',
    ContentEncoding : 'utf8',
  };

  params.Body = html

  const retv2 = await s3.putObject(params)
  console.log(`@409 <${Bucket}><${Key}> (${html.length})`,{retv2})
  return retv2;
}
