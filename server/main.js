import { Meteor } from 'meteor/meteor';

const fs = require('fs-extra');
const path = require('path')
const assert = require('assert')
const s3client = require('./lib/aws-s3.js')();
const Massive = require('massive');
const monitor = require('pg-monitor');
const {parse_s3filename} = require('/shared/utils.js')

let db =null;

assert(s3client.readdir, 'undefined s3.readdir')

require('./lib/new-article.js')
//require('./lib/get-s3object-method.js')
//require('./lib/put-s3object-method.js')
const utils = require('./lib/utils.js')
const util2 = require('/shared/utils.js')


Meteor.startup(() => {
  // code to run on server at startup
  // console.log(`@11: `, www_root.init('/www'))
  require('./get-e3md.js').init('/www');
//  console.log(`@12 Meteor.startup: `,{s3})
  console.log(`@13 Meteor.startup - ping ->`,s3client.ping())
});

Meteor.onConnection((x)=>{
  console.log(`@11: onConnection `,x)
  console.log(`@11: onConnection.httpHeaders.host `,x.httpHeaders.host)
})

/*
Meteor.methods({
  'get-e3data': async (cmd) =>{
    const {get_e3md} = require('./get-e3md.js')
    console.log(`@15: >> get-e3md:`,{cmd})
    return await get_e3md(cmd);
  }
});*/


Meteor.methods({
  'get-s3object': async (cmd) =>{
    try {
      if (typeof cmd === 'string') {
        cmd = parse_s3filename(cmd);
      }

      console.log(`@50 `,{cmd})
      const {Bucket, Key, VersionId} = cmd;
      if (! Bucket) throw 'Missing Bucket'
      if (! Key) throw 'Missing Key'
      const p1 = {Bucket, Key, VersionId};
      /*
      const retvv = s3clientparse_s3filename(s3_url);
      console.log({retvv})
      assert(Bucket)
      assert(Key)*/

      const retv = await s3client.getObject(p1); //.Body.toString('uft8')
      if (!retv || retv.error || !retv.Body) {
        console.log(`file-not-found : `,{Bucket},{Key})
        return {error:'file-not-found'}
      }

      const {ETag, Body, LastModified} = retv;
      return {
        ETag, VersionId,
        LastModified, // to flag non-live documents
        data: Body.toString('utf8'),
      }
    }
    catch(err) {
      console.trace(`@61 method::get-s3object`)
      console.log(`@61 method::get-s3object `,{err})
      console.log(`@61 method::get-s3object  cmd:`,cmd)
      throw err;
    }
  }
});

Meteor.methods({
  'put-s3object': async (cmd) =>{
    //console.log(`@22: commit_s3data cmd:`,cmd)
    try {
      const {s3_url, data} = cmd;
      // const {meta, md, err} = utils.extract_metadata(data);

      //console.log(`@60 `,{cmd})
      utils.putObject({s3_url, data}); // this is able to set the mime-type
    }
    catch(err) {
      console.log(`@106 Method:commit-s3data `,{err})
      return {error:'sysError@106'}
    }
  }
});

Meteor.methods({
  'save-e3data': (cmd) =>{
    console.log(`@39: save-e3data cmd:`,cmd)
    const {host,pathname,xid,data,update} = cmd;
    assert(host);
    assert(pathname);
    assert(xid);
    assert(data)

    /******************************************************
      ANALYSE s3_url and select hooks
    *******************************************************/

    const {save_e3md} = utils.setCustom(cmd.s3_url)
    return save_e3md(cmd);
  }
});

class s3path {
  constructor(fn) {
    const {Bucket,Key} = parse_s3filename(fn)
    this.Bucket = Bucket;
    this.Key = Key;
    this.value = fn;
//    console.log(`@61 `,{Bucket},{Key},{fn})
    return this
  }
  add(value) {
    this.Key = path.join(this.Key,value)
    this.value = 's3://'+path.join(this.Bucket,this.Key)
//    console.log(`@65 Key:`,this.Key)
//    console.log(`@66 value:`,this.value)
    return this;
  }
  parent() {
    const {dir} = path.parse(this.Key)
    this.Key = dir;
    this.value = 's3://'+path.join(this.Bucket,this.Key)
//    console.log(`@72 Key:`,this.Key)
    return this;
  }
}

(()=>{
  console.log(`@78 `,new s3path('s3://blueink/ya15').parent().add('ya14').add('index.html').value)
  if (new s3path('s3://blueink/ya15').parent().add('ya14').add('index.html').value != 's3://blueink/ya14/index.html') {
    console.log('FATAL @74'); process.exit();
  }
  console.log(`@86 test passed`)
})();


Meteor.methods({
  'commit-s3data-obsolete': async (cmd) =>{
    //console.log(`@22: commit_s3data cmd:`,cmd)
    try {
      const {s3_url, data} = cmd;
      // const {meta, md, err} = utils.extract_metadata(data);

      //console.log(`@60 `,{cmd})
      utils.putObject({s3_url, data}); // MD-code
    }
    catch(err) {
      console.log(`@106 Method:commit-s3data `,{err})
      return {error:'sysError@106'}
    }
  }
});


function extract_xid(s3fn) {
  const v = s3fn.split('/');
  const k = v.length;
  if (v[k-1] == 'index.md') {
    return v[k-2];
  }
  if (v[k-1].startsWith('index')) {
    return v[k-2];
  }
  if (v[k-1].endsWith('.md')) {
    return v[k-2];
  }
  if (v[k-1].endsWith('.html')) {
    return v[k-2];
  }
  return v[k-1]
}

(()=>{
  assert(extract_xid('s3://blueink/ya14/1202-Y3K2/index.md')=='1202-Y3K2');
  assert(extract_xid('s3://blueink/ya14/1202-Y3K2')=='1202-Y3K2');
})()




Meteor.methods({
  'publish-s3data': async (cmd) =>{
    const verbose =1;

    ;(verbose>0) && console.log(`@194: publish-s3data cmd:`,cmd)
    try {
      const {s3_url, data, update} = cmd;
      if (!s3_url) throw new Meteor.Error('sys-error','','@196 publish-s3data : missing s3_url');

      const {xid, fn} = util2.extract_xid2(s3_url);

      if (!xid) {
        if(fn.endsWith('.md')) throw new Meteor.Error('sys-error','',`@203 sys-error`);
        const retv = await utils.putObject({s3_url, data}); // MD-code
        console.log(`@204 publish-s3data thinks it is not publishable.`)
        return {
          warning: 'nothing-published',
          error: null,
          data: retv
        }
      }


      const {meta, md, err} = util2.extract_metadata(data);
      ;(verbose>0) && console.log(`@214: `,{meta},{err})

      /***********************

      ************************/


      meta.xid = xid;
      ;(verbose>0) && console.log(`@222: `,{meta},{err})
      const retv1 = await utils.putObject({s3_url, data}); // MD-code
      ;(verbose>0) && console.log(`@224: `,{retv1})


//      const yaml_fn = new s3path(s3_url).parent().parent().add('.publish.yaml').value;
      const {Bucket,subsite} = util2.extract_subsite(s3_url)
      ;(verbose>0) && console.log(`@225: `,{Bucket},{subsite})
      const yaml_fn = path.join(Bucket,subsite,'.publish.yaml')

      ;(verbose>0) && console.log(`@227: `,{yaml_fn})
      const {data:publish_cfg} = await utils.get_yaml_object(yaml_fn);

      ;(verbose>0) && console.log(`@228: `,{publish_cfg})

      if (!publish_cfg) throw `Missing config file (.publish.yaml)`

      ;(verbose>0) && console.log(`@63 `,{publish_cfg})
      const {template:template_fn} = publish_cfg;

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

      const {html} = await custom.mk_html({meta,md,s3_url, subsite,template_fn})
      ;(verbose>0) && console.log(`@110 `,{html})


//      const html_fn = new s3path(s3_url).parent().add('index.html').value;
      const html_fn = path.join(Bucket,subsite,xid,'index.html')
      utils.putObject({s3_url:html_fn, data:html}); // MD-code

      const {meta_tags, raw_text} = scan_e3live_data(html)
      ;(verbose>0) && console.log(`@218 `,{meta_tags},{raw_text})

      const meta_path = meta.path || publish_cfg.path;
      assert(meta_path, `@224 Missing path.`)

      if (!db) {
          console.log(`@120 INIT POSTGRES/BLUEINK CONNECTION`)
        db = await postgres_connect()
      }

      const pageNo =0;
      /*
      const ts_data = Object.assign(meta_tags, {
          index_title: `<div>atitle for index-page</div>`
      })*/

      // this also should be custom-code
      const diams = ' &diams; '
//      const diams = ' &loz; '
      meta.abs = meta.abs && meta.abs.replace(/\n/g,diams).replace(/\s+/g,' ').trim();
      const raw_text_ = (meta_tags.h1 || '') + diams + (meta.abs || raw_text);


      const url = util2.s3fn_to_url(s3_url)
      const h1_html = custom.deeps_headline({url,xid,title:meta_tags.h1, meta_tags, s3_url, meta, path:meta_path})

      const ts_data = Object.assign(meta_tags, {
        url,
        h1_html, // temporary
        index_title: h1_html
      })


      const retv = await db.adoc.write_pagex(meta_path, xid, pageNo, ts_data, raw_text_);
      ;(verbose>0) && console.log(`@254 `,{retv})

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
      console.log(`@130 Method:publish-s3data catch >>`,{err})
      throw err;
    }
  }
});



Meteor.methods({
  'e3list': (cmd) =>{
    const {url} = cmd;
    assert(url);
    const {e3list} = require('./get-e3md.js')
    return e3list(cmd);
  }
});

Meteor.methods({
  'ping': ()=>{
    const conn = this.connection; // is it ready ? not sure.
    console.log(`@50: conn =>`,conn)
    return conn.id;
  }
})


function get_pg_env() {
  const env1 = process.env.METEOR_SETTINGS && JSON.parse(process.env.METEOR_SETTINGS)
  if (env1) {
    // on the server
    const {PGUSER, PGPASSWORD} = env1;
    return {PGUSER, PGPASSWORD}
  }
  const {PGUSER, PGPASSWORD} = process.env;
  return {PGUSER, PGPASSWORD}
}


function postgres_connect() { // should go in utils.
  const {PGUSER:user, PGPASSWORD:password} =  get_pg_env();
  console.log(`@110 Massive startup w/passwd: <${password}>`);
  return Massive({
      host: 'ultimheat.com',
      port: 5434,
      database: 'blueink',
      user,
      password
  })
  .then(db =>{
    monitor.attach(db.driverConfig);
    return db;
  })
}


Meteor.methods({
  'get-s3Object-versions': async (s3_url)=>{
      const data = await s3client.listObjectVersions(s3_url)
//      return data.Versions;
      return data.Versions.map(it =>{
        const {ETag, IsLatest, LastModified, Size, VersionId} = it;
        return {ETag, IsLatest, LastModified, Size, VersionId}
      })
  }
})


Meteor.methods({
  'subsite-directory': async (sdir)=>{
    const verbose =0;
    try {
      ;(verbose >0) &&console.log(`@360 subsite-directory `,{sdir})
  //    util2.assert_type(sdir, 'string', '@375 Invalid Type')
      const list_ = await s3client.readdir(sdir)
      if (!list_) {
          return {error:'empty-list', list:null}
      }
      ;(verbose >0) &&console.log(`@367 subsite-directory `,{list_})

      const {Bucket,subsite} = util2.extract_xid2(sdir)

      const list = list_.map(({Prefix}) =>{
        // { Prefix: 'projects/227-blueink-db/' }
        const {dir,name} =  path.parse(Prefix)
        return name;
      })
      ;(verbose >0) &&console.log(`@366 subsite-directory ${list.length} rows.`)
      return {
        prefix:subsite,
        list,
        error:null
      }
    }
    catch(err) {
      console.trace(`@372`)
      console.log(`@372 `,{err})
    }
  }
})

// ---------------------------------------------------------------------------

Meteor.methods({
  'get-template': async (s3_url)=>{
    const verbose =1;
    // make sense only for index.md
    // template url is in <subsite>/.publish.yaml
    try {
      const {Bucket,subsite} = util2.extract_subsite(s3_url);
      const yaml_fn = path.join(Bucket,subsite,'.publish.yaml')
      ;(verbose>0) && console.log(`@227: `,{yaml_fn})
      const {data:cfg} = await utils.get_yaml_object(yaml_fn);
      ;(verbose>0) && console.log(`@421 `,{cfg})

      const {template:template_fn} = cfg;
      console.log(`@428 `,{template_fn})

      const retv = await s3client.getObject(template_fn)
      console.log(`@429 `,{retv})
      const {Body, ETag, VersionId} = retv;
      if (!ETag) throw '@432 file-not-found'


//      const retv2 = await s3client.getObject('s3://abatros/projects/mk-html.js')
      const retv2 = await s3client.getObject('s3://blueink/ya14/mk-html.js')
      console.log(`@435 `,{retv2})
      if (!retv2.ETag) throw '@436 file-not-found'

      return {
        error: null,
        html: Body.toString('utf8'),
//        compiled, // template compiled it's a function cannot send.
        renderer: {
          name: 'dkz',
          js: retv2.Body.toString('utf8')
        }
      }
    }
    catch(err) {
      console.log(`@431 CATCH ERROR `,{err})
    }

  }
})

// --------------------------------------------------------------------------


Meteor.methods({
  'delete-object': async (p1)=>{
    if (typeof p1 === 'string') {p1 = parse_s3filename(p1)}

    const {Bucket, Key, VersionId} = p1;
    p1 = {Bucket, Key, VersionId};

    const data = await s3client.deleteObject(p1);
    console.log(`@477 deleted version <${data.VersionId}>`)
    return {VersionId: data.VersionId}
  }
})
