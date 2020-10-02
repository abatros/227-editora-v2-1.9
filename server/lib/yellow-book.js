const fs = require('fs')
const path = require('path')
const assert = require('assert')
const yaml = require('js-yaml');

const hb = require("handlebars");
const marked = require('marked');
const shortid = require('shortid')
const cheerio = require('cheerio')
const utils = require('./utils.js')
const {postgres_connect} = require('./postgres-connect.js')

const s3 = require('./aws-s3.js')();

// ---------------------------------------------------------------------

const renderer = new marked.Renderer({
});

/*
renderer.br = function (code,infostring,escaped) {
  console.log(`@19 BR code-----------\n${code}\----------\n [${infostring}] stripped XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
}

renderer.hr = function () {
  console.log(`@19 BR stripped XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
}

renderer.code = function () {
  console.log(`@19 CODE stripped XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
}*/

renderer.blockquote = function (x) {
  console.log(`@19 QUOTE stripped XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`,{x})
  return 'AQUOTE'
}

marked.setOptions({
  renderer,
/**
  renderer: new marked.Renderer(),
  highlight: function(code, language) {
    const hljs = require('highlight.js');
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    return hljs.highlight(validLanguage, code).value;
  },
  pedantic: false,
  gfm: true,
  */
  breaks: true,
  /*
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false */
});



// ---------------------------------------------------------------------

/***
// consult .config.yaml to get template
**/

const template_fn = 's3://abatros/yellow/yellow-page-template-v1.html';

let compiled_template;  // a function

//const compiled_template =

async function get_compiled_template() {
  if (compiled_template) return compiled_template;

  const {Bucket, Key} = parse_s3filename(template_fn)
  const o1 = await s3.getObject({Bucket, Key});
  const template = o1.Body.toString('utf8')
  compiled_template = hb.compile(template);
  //return compiled_template;
  console.log(`template <${template_fn}> compiled.`)
  return compiled_template;
};

module.exports = {
  commit_s3data,
}

/*********************
function get_accessKeys() {
  const env1 = process.env.METEOR_SETTINGS && JSON.parse(process.env.METEOR_SETTINGS)
  if (env1) {
    const {accessKeyId, secretAccessKey} = env1;
    return {accessKeyId, secretAccessKey}
  }
  const {accessKeyId, secretAccessKey} = process.env;
  return {accessKeyId, secretAccessKey}
}

const {accessKeyId, secretAccessKey} = get_accessKeys();

let s3 = require('./aws-s3.js')({accessKeyId, secretAccessKey})
console.log({s3})
***********/

function save_e3md(cmd) {
  console.log(`> yellow-book::save_e3md `,{cmd})
  const {host,pathname,xid,md_path,update} = cmd;
  let {data} = cmd;
  assert(host);
  assert(pathname);
  assert(xid);
  return {status: 'failed'}
}


async function commit_s3data(cmd) {
  verbose =0;
  console.log(`> yellow-book::commit_s3data `,{cmd})

  /**********************************

    (1) save MD-file

  ***********************************/

  const {s3fpath, data} = cmd;
  assert(s3fpath)
  assert(data)
  const {Bucket,Key} = parse_s3filename(s3fpath);
  ;(verbose >0) && console.log(`@90 Key:${Key}`)


  const p1 = {
    Bucket,
    Key,
    Body: data,
    ACL: 'public-read',
    ContentType: 'text/md',
    ContentEncoding : 'utf8',
  };
  console.log(`@92 commit_s3data `,{p1})

  const retv1 = await s3.putObject(p1);
  console.log({retv1})

  /**********************************

    (2) rebuild html

  ***********************************/

  const {meta, md, err} = utils.extract_metadata(data);
  if (!meta) {
    console.log(`@155 alert `,{meta},{err},{data})
  }

  const {html} = await mk_html({s3fpath, meta,md})

  /************************************

    (3) write HTML

  *************************************/

  const {dir,name} = path.parse(Key)
  // name: 1202-Y3K2.index.md
  const html_Key = path.join(dir,'index.html')
  ;(verbose >0) &&console.log({html_Key})

  const p2 = {
    Bucket,
    Key: html_Key, //'tests/1.html', //: 'tests/'+Key,
//    Body: html,
    ACL: 'public-read',
    ContentType: 'text/html',
    ContentEncoding : 'utf8',
  }

  // console.log({p2})

  const retv2 = await s3.putObject(Object.assign(p2,{Body:html}));
  ;(verbose >0) && console.log(`@128 commit_s3data `,{retv2})
  if (retv2.err) {
    console.log(`@130 commit_s3data error `,{retv2})
  }
  retv2.status = 'committed';

  /************************************************

    (4) update ts-vector

  *************************************************/

  // get xid
  const {name:xid} = path.parse(dir); // ex: yellow/103-xxxxx/
  assert(xid);
  assert(html)

  ;(verbose >0) && console.log(`@155 xid:${xid} (from fileName Key)`)

  const db = await postgres_connect();
  assert(db)


  const retv3 = await html2ts_vector({db, xid, html, dryRun:false})


  console.log(`@152 Leaving commit_s3data -Ok.`)
  return {status: 'ok'}
} // commit_s3data

/*

    rebuild HTML - does not write on S3://bucket

*/

async function mk_html({s3fpath, meta, md}) {
  const verbose =0;

  ;(verbose) && console.log(`@148 Entering mk_html(s3fpath:${s3fpath})`, {meta})

  /*****************************************************

      meta.xid is ignored - replaced w/ s3fpath name
      meta.title used for page title - default to

  ******************************************************/

  assert(s3fpath.startsWith('s3://'))
  const {dir,name,base} = path.parse(s3fpath.substring(5)); //"s3://"
  const {base:xid} = path.parse(dir)
  meta.xid = xid;
  meta.title = meta.title | xid;

  console.log(`@162 dir:<${dir}> `,{meta})


  /*
  if (!meta.xid) {
    console.log(`@130 missing meta.xid `,{meta})
    throw 'break@131'
  } */

  if (! md) {
    console.log(`@130 missing md-code `,{meta})
    throw 'break@136'
  } else {
    console.log(`@138 md.length:${md.length}`,{meta})
  }


  meta.shortid = shortid.generate()
  ;(verbose) && console.log(`@177 :`, {meta})

  // split en/th
//  const html1 = md && marked(md, { renderer: renderer });
  const html1 = md && marked(md);
  console.log(`@147 html1.length:${html1.length}`)
  console.log(`@148 `,{html1})

  Object.assign(meta, {
    shortid: meta.shortid,
//    title: meta.h1 || 'title-not-found',
    article:html1.replace(/\\rarr[\s]+/g,'&rightarrow;')
  })

  console.log(`@159 mk-html `,{meta})

  const compiler = await get_compiled_template()
  const html = compiler(meta);
  ;(verbose >0) && console.log(`@110 html.length:${html.length}`)
  ;(verbose >1) && console.log(`@161 :`, {html})
  return {html, s3fpath, meta, md}; //Object.assign(p1,{html});
}

// ---------------------------------------------------------------------------



async function html2ts_vector({db, xid, html, dryRun}) {
  const verbose =0;
//  const {en,th,'meta.pdf':pdf, 'meta.img':img, meta} = scan_e3live_data(html)
  const retv1 = scan_e3live_data(html)
  ;(verbose >0) && console.log(`@233 `,{retv1})
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

  const raw_text = article.split(/\r?\n/).join(' ').replace(/\s+/,' ')
  ;(verbose >0) && console.log({raw_text})

//  const xid = `${meta.xid}-${meta.sku}`; // blueink actual format.

  if (dryRun) {
    console.log(`DRY-RUN html2ts-vector raw_text.length:${raw_text.length}
      meta_tags.xid: ${meta_tags.xid}
      xid:${xid}
    `)
    return;
  }

  //meta.xid = xid; // no more need for xid alone.

  meta_tags.h1_html = `
  <div class="h1-deeps-item">
    <a href="https://abatros.com/yellow/${xid}/index.html"
      target="_blank" title="article : ${xid}">${meta_tags.h1}</a>
  </div>
  `

  const retv = await db.adoc.write_pagex('dkz.yellow', xid, pageNo=0,
        meta_tags, raw_text);
  return retv;
}

// -------------------------------------------------------------------------


function scan_e3live_data(html) {
  const verbose =0;
  const o ={};

  function add(k,v) {
    k = k.replace(/e3live\./,'')
    if (o[k] && o[k]!=v) {
      throw `ALERT-confusion o[${k}]:${o[k]}`
    }
    o[k] = v;
  }

  const $ = cheerio.load(html)
  const meta_tags = get_meta_tags($)
  console.log(`@292 `,{meta_tags})
  if (!meta_tags['xid']) {
    console.log(`ALERT e3live.xid is missing, skipping.`)
    console.log(`@291 `,{meta_tags})
    // the caller must fix that.
//    throw 'SHOULD DEFAULT TO xid_'
//    return null;
  }

  meta_tags.h1 = $('article.js-e3live h1').text();
  // could be copied into meta_tags

  const article = $('article#main').text()

  const o2 = {article, meta_tags}
  console.log(`@341: `,o2)
  return o2;
}



function get_meta_tags($) { // HEAD
  // return document.getElementsByTagName('meta').e3root.content;
////  const selector = `meta[name="${key}"]`
//  const meta = $('meta').attr('content');
  const o ={};
  function add(k,v) {
    k = k.replace(/^e3live\./,'')
    if (o[k] && o[k]!=v) {
      throw `ALERT-confusion o[${k}]:${o[k]}`
    }
    o[k] = v;
  }


  $('meta').each((j,it) =>{
    const name = $(it).attr('name');
    if (name) {
//      meta[name] = $(it).attr('content')
      //console.log(`-- meta[${name}]:"${meta[name]}"`)
      add(name, $(it).attr('content'))
    }
  })
  return o;
}
