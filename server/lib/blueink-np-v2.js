const fs = require('fs')
const path = require('path')
const assert = require('assert')
const yaml = require('js-yaml');
const shortid = require('shortid');

const hb = require("handlebars");
const marked = require('marked');
const renderer = new marked.Renderer();
const s3 = require('./aws-s3.js')(); // already initialized.
const utils = require('./utils.js')
const shared_utils = require('/shared/utils.js')
const {parse_s3filename} =  require('/shared/utils.js')

const cheerio = require('cheerio');

/*****************************************************************************

    Version Aug 28
    blueink-np are in : /ya14/1202-Y2K3/index.md
    configuration must be in : /ya14/.publish.yaml
    if exists /ya14/1202-Y2K3/master.md -- it is not a blueink-np

******************************************************************************/


const template_fn = 's3://blueink/ya14/blueink-page-template-v4.html';

const cache_template = {
  template_fn:null,
  compiled:null
}

async function commit_s3data(cmd) {
  const verbose =2;
  const {s3fpath, data:md_code} = cmd;
  assert(s3fpath)
  assert(md_code)

  ;(verbose >1) && console.log(`-------------
    commit-s3data (1) write md-file`);


  const {Bucket,Key} = parse_s3filename(s3fpath);

  const p1 = {
    Bucket,
    Key, //: 'tests/'+Key,
    Body: md_code,
    ACL: 'public-read',
    ContentType: 'text/md',
    ContentEncoding : 'utf8',
  };
  ;(verbose >0) && console.log(`commit_s3data `,{p1})
  const retv1 = await s3.putObject(p1);
  ;(verbose >0) && console.log({retv1})

  /*
      rebuild html page
  */

  ;(verbose >1) && console.log(`-------------
    commit-s3data (2) rebuild html`);



  const dirName = dir_Name(s3fpath);
  assert(dirName)
  assert(template_fn)

  const {meta, md, err} = utils.extract_metadata(md_code);
  const {html} = await mk_html({meta,md,s3fpath,dirName,template_fn})

// console.log({html})

  /*
    compute Key for HTML.
    THIS is specific to blueink new-products  !!!!!!!!!!!!!!
    ex: s3://blueink/ya14/1202-Y3K2/1202-Y3K2.index.md
    each site should have its own conversion.
  */

  ;(verbose >1) && console.log(`-------------
    commit-s3data (3) write html`);


  const {dir,name} = path.parse(Key)
  // name: index.md
  const {name:xid} = path.parse(dir)
  assert(xid.length >6);

  const html_Key = path.join(dir,'index.html')
  ;(verbose >0) && console.log({html_Key})
  const p2 = {
    Bucket,
    Key: html_Key, //'tests/1.html', //: 'tests/'+Key,
//    Body: html,
    ACL: 'public-read',
    ContentType: 'text/html',
    ContentEncoding : 'utf8',
  }

  ;(verbose >0) && console.log({p2})

  const retv2 = await s3.putObject(Object.assign(p2,{Body:html}));

  ;(verbose >0) &&
  console.log(`html-file [${html.length}] versionId:<${retv2.VersionId}>`);

  ;(verbose >1) && console.log(`-------------
    commit-s3data (2) rebuild ts-vector`);

  const {raw_text, meta_tags} = scan_e3live_data(html)
  console.log(`@113 `,{html},{raw_text})


  const {h1, img, ori, sku} = meta_tags; // ignore xid in meta_tags
  const data = {h1, img, ori, sku};
  const retv3 = await commit_ts_vector({html, path:'blueink.np', xid, data, raw_text})

  return retv2;
} // commit-s3data


// ---------------------------------------------------------------------




async function commit_ts_vector(cmd) {
  const verbose =0;
  const {html,
    path='jpc.products.en',
    xid,
    data, // mostly meta-tags
    raw_text
  } = cmd;

  if (!db) {
    console.log(`@120 INIT POSTGRES/BLUEINK CONNECTION`)
    db = await postgres_connect()
  }

  const pageNo =0;

  const retv = await db.adoc.write_pagex(path, xid, pageNo, data, raw_text);
  ;(verbose>0) && console.log(`@60: `,{retv})

  console.log(`TODO commit_ts_vector....`)
}



// -------------------------------------------------------------------------


function scan_e3live_data(html) {
  const verbose =0;

  const $ = cheerio.load(html)
  const meta_tags = utils.get_meta_tags($)
//  console.log({head_meta})
  if (! meta_tags['xid']) {
    console.log(`ALERT e3live.xid is missing, skipping.`)
    //console.log(`@164 `,{meta_tags})
//    return {};
  }
  // console.log(`@158 html.length:${html.length}`,{meta_tags})
  // get H1
//  o.h1 = $('section#en h1').text();
  const h1 = $('article.en h1').text();
  const en = $('article.en').text();

  meta_tags.h1 = h1;

  const raw_text = en.split(/\r?\n/).join(' ').replace(/\s+/,' ')
  return {meta_tags, raw_text};
}

// -------------------------------------------------------------------------

function mk_h1_html_Obsolete(xid,h1) {
  return `<div class="h1-deeps-item">
    <a href="https://ultimheat.co.th/ya14/${xid}/index.html"
      target="_blank" title="article : ${xid}">${h1}</a>
  </div>
  `;
}

// ------------------------------------------------------------------------

function deeps_headline({url,title, meta, meta_tags, s3_url:s3fn, path}) {

  const s3fn_ = (s3fn.startsWith('s3://')) ? s3fn.substring(5): s3fn;
  const {Bucket, subsite, xid} = shared_utils.extract_xid2(s3fn)

  title = title || `missing title for ${s3fn}`

  return `<div class="h1-deeps-item">
    <a href="https://ultimheat.co.th/ya14/${xid}/index.html"
      target="_blank" title="article : ${xid}">${title}</a>
  </div>
  `;

  /*
  return `<div class="h1-deeps-item">
      <a href="https://${Bucket}.com/${subsite}/${xid}"
        target="_blank"
        title="article : ${xid}">${title}</a>
        &ensp;
        &mdash;
        &ensp;
        <a target="_blank" href="editora.us/edit?s3=${s3fn_}"> [edit] </a>
        &emsp;
        [${path}]
    </div>
    `; */
}


// -------------------------------------------------------------------------


// ---------------------------------------------------------------------------

function dir_Name(o_path) {
  const {Key} =  parse_s3filename(o_path)
  const {dir:product} = path.parse(Key)
  // here we have ex: //blueink/<product>
  const {dir:dirName} = path.parse(product)
  return dirName
}

// ---------------------------------------------------------------------------

//       const {html} = await mk_html({meta,md,s3fpath, subsite,template_fn})

async function mk_html_v2(p1) {
  const verbose =0;

  if (typeof p1 === 'string') {
    throw "Invalid parameter for mk_html"
  }
  ;(verbose >0) && console.log(`@241 [${module.id}]`,{p1})
  const {meta,
    md,
    subsite = '/',      // from o__path s3://blueink/ya14  => ex: "ya14"
    template_fn,
    s3_url, // for md-file
  } = p1;

  assert(s3_url.endsWith('.md'), `[${module.id}] fatal@252`);

  // split en/th
  const [md_en, md_th] = md.split('\\th')
  const en_html = md_en && marked(md_en, { renderer: renderer });
  const th_html = md_th && marked(md_th, { renderer: renderer });

  assert(meta)
  assert(shortid)
  meta.shortId = shortid.generate();

  if ((template_fn != cache_template.template_fn)||(! cache_template.compiled)) {
    cache_template.template_fn =null;
    cache_template.compiled =  await utils.compile_template(template_fn); // *******************************************
    cache_template.template_fn =template_fn;
  }


  ;(verbose >0) && console.log(`@137 `,{cache_template})
  ;(verbose >0) && console.log(`@138 `,{meta})

  const {shortId, img:meta_img, pdf:meta_pdf, ori, sku} = meta;


  // (1) s3://blueink/ya14/1202-Y3K2.md
  // (2) s3://blueink/ya14/1202-Y3K2/xxxxxxxxxxx.pdf
  // we need ya14/1202-Y3K2 from Key

  const {Key,ext} = parse_s3filename(s3_url)
  assert((ext == '.md'), `[${module.id}] fatal@281`);
  // Key: ya14/1202-Y3K2.md

  const {dir,base,name:xid} = path.parse(Key)
  // dir: ya14
  // base: 1202-Y3K2.md
  // name: 1202-Y3K2

  const o = {
    xid,
    ori,
    subsite, // https://ultimheat.co.th/<subsite>
    template_fn,
    shortId,
    meta_img,
    meta_pdf,
    pdf: path.join(dir,xid,meta.pdf),
    pic: path.join(dir,xid,meta.img),
  }

  ;(verbose >0) && console.log(`@300 [${module.id}] about to compile o:`,o)

  Object.assign(o, {
    en_html, th_html
  })


  const html = cache_template.compiled(o);

//  console.log(`@62 :`, {html})
  return Object.assign(p1,{html});
}

// ---------------------------------------------------------------------------

//       const {html} = await mk_html({meta,md,s3fpath, subsite,template_fn})

async function mk_html(p1) {
  const verbose =0;

  if (typeof p1 === 'string') {
    throw "Invalid parameter for mk_html"
  }
  console.log({p1})
  const {meta, md,
    s3fpath,
    dirName,      // from o__path s3://blueink/ya14  => ex: "ya14"
    template_fn } = p1;

  assert(dirName)

  const {Bucket, Key} = parse_s3filename(s3fpath)
  const {dir,name} = path.parse(Key)

  // split en/th
  const [md_en, md_th] = md.split('\\th')
  const en_html = md_en && marked(md_en, { renderer: renderer });
  const th_html = md_th && marked(md_th, { renderer: renderer });

  /*
  const th_html = md_th && marked(md_th.split(/\s*\r?\n/).join('  \n'),
      { renderer: renderer });
      */


  meta.shortid = shortid.generate();

  if ((s3fpath != cache_template.s3path)||(! cache_template.compiled)) {
    cache_template.s3path =null;
    cache_template.compiled =  await utils.compile_template(template_fn); // *******************************************
    cache_template.s3path =s3fpath;
  }


  ;(verbose >0) && console.log(`@137 `,{cache_template})


  const html = cache_template.compiled(Object.assign(meta, {
    dirName,
    template_fn,
    shortid: meta.shortid,
    meta_img: meta.img,
    meta_pdf: meta.pdf,
    pdf: '/'+path.join(dir,meta.pdf),
    pic: '/'+path.join(dir,meta.img),
    en_html, th_html
  }));


//  console.log(`@62 :`, {html})
  return Object.assign(p1,{html});
}

// ------------------------------------------------------------------------

function scan_e3live_data_Obsolete(html) {
  const verbose =0;
  const o ={};

  /*
  function add(k,v) {
    k = k.replace(/e3live\./,'')
    if (o[k] && o[k]!=v) {
      throw `ALERT-confusion o[${k}]:${o[k]}`
    }
    o[k] = v;
  }*/

  const $ = cheerio.load(html)
  const meta_tags = utils.get_meta_tags($)
  console.log(`@292 `,{meta_tags})
  if (!meta_tags['xid']) {
    console.log(`ALERT e3live.xid is missing, skipping.`)
    console.log(`@291 `,{meta_tags})
    // the caller must fix that.
//    throw 'SHOULD DEFAULT TO xid_'
//    return null;
  }
//  console.log(`\n----------------------\n`,{meta_tags})

  // get H1
//  o.h1 = $('section#en h1').text();

  /*********************

  add <h1> to meta_tags -> for index.

  **********************/

  meta_tags.h1 = $('article.js-e3live h1').text();
  // could be copied into meta_tags

  const article = $('article#main').text()

  const o2 = {article, meta_tags}
  console.log(`@341: `,o2)
  return o2;
}

// -------------------------------------------------------------------------


async function mk_index(o_path, index) {
  if (o_path.endsWith('/')) o_path = o_path.slice(0,-1)
  console.log(`@424 make_index(${o_path})`,index)

  const ul = index
  .map((it,j) =>{
//    const fname = it.Prefix.substring(5).replace('/index.html','');
    return `<div>${j} <a href="https://ultimheat.co.th/np/${it}">${it}</a></div>`
  }).join('\n')


  //  console.log({ul})

  const {Bucket, Key} = parse_s3filename(o_path)

  const retv = await s3.putObject({
    Bucket,
    Key,
    Body: `<html>\n${ul}</html>`,
    ACL: 'public-read',
    ContentType: 'text/html;charset=utf8;',
    ContentEncoding : 'utf8',
  })

  console.log(`@391 write_index =>`, Object.assign(retv,{Bucket,Key,o_path}))
}

function mk_index1({xid, html}) {
  const verbose =0;
//  const {en,th,'meta.pdf':pdf, 'meta.img':img, meta} = scan_e3live_data(html)

  const retv1 = scan_e3live_data(html)
  console.log(`@233 `,{retv1})
  if (!retv1) {
    console.log(`@239 ALERT `,{html})
    return;
  }
  const {article, meta_tags} = retv1;
  if (article == undefined) {
    console.log(`@244 xid:<${xid}>\n`,{article},{meta_tags})
    throw 'break@245'
  }

  ;(verbose >0) && console.log(`@273 `,{meta_tags})
  ;(verbose >0) && console.log(`@274 `,{article})

  ;(xid != meta_tags.xid) && console.log(`ALERT meta_tags.xid:${meta_tags.xid} does not match.
    ANYWAY: meta_tags.xid is irrelevant
    `,{xid})

  // get h1

  return {irow: `<div><a href="/yellow/${xid}/index.html">${xid}</a>${meta_tags.h1}</div>`};
}




// -------------------------------------------------------------------------

// keep this way : like a directory (TOC) avoid search.

module.exports = {
  moduleId: module.id, //'yellow-book-v2.js',
  commit_s3data,
  commit_ts_vector,
  scan_e3live_data,
  deeps_headline,
//  mk_h1_html,
  mk_html: mk_html_v2,
  mk_index,
}
