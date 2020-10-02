import { Meteor } from 'meteor/meteor';

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert')
const yaml = require('js-yaml')
const s3 = require('./lib/aws-s3.js')();
const Massive = require('massive');
const monitor = require('pg-monitor');
const {parse_s3filename} = require('/shared/utils.js')
const {postgres_connect} = require('/server/lib/postgres-connect.js')
require ('./methods/deep-search.js')
require ('./methods/refresh-web-page.js')
require ('./methods.js')
import {fix_folder_v2, fix_md_mime_type, migration_v1} from './lib/utils.js'
require ('./http-server.js')
require ('/server/http-server/museum')

let db = null; //  must be in async await postgres_connect();
const verbose =0;

assert(s3.readdir, 'undefined s3.readdir')

require('./lib/new-article.js')
//require('./lib/get-s3object-method.js')
//require('./lib/put-s3object-method.js')
const utils = require('./lib/utils.js')
const util2 = require('/shared/utils.js')


Meteor.startup(async () => {
  console.log(`@48 [${module.id}] Entering Meteor.startup...`)

  // code to run on server at startup
  // console.log(`@11: `, www_root.init('/www'))
  if (false) require('./get-e3md.js').init('/www');
//  console.log(`@12 Meteor.startup: `,{s3})
  console.log(`@13 Meteor.startup - ping ->`,s3.ping())
  db = await postgres_connect();
  // await fix_folder('s3://abatros/projects')
  //await fix_folder_v2('s3://abatros/projects')
  //await fix_folder_v2('s3://abatros/yellow')
  //await fix_folder_v2('s3://publibase/ya14')
  //await fix_md_mime_type('s3://publibase/ya14')
  //await fix_md_mime_type('s3://publibase/projects')
  // await migration_v1('s3://blueink/ya14', 's3://blueink/np')
  ;(async ()=>{
return;
    const retv = await s3.purgeObject('s3://blueink/np/1202-Y3K2')
    console.log(`@44 listObjectVersions('s3://blueink/np/1202-Y3K2')=>\n`,retv.reverse())
  })();
//  const retv = await s3.delete_s3Object('s3://blueink/np/1202-Y3K2')

  ;(async ()=>{
return; // some issue here....
    const retv = await s3.putBucketVersioning('caltek','Enabled');
    console.log(`@51 putBucketVersioning =>`,retv)
  })();

  ;(async ()=>{
return;
    const Objects_ = await s3.listObjectVersions({
      Bucket: 'abatros',
      Prefix: '',
      Delimiter: ''
    });
    console.log(`@62 listObjectVersions() => ${Objects_.length}`)
    const Objects = Objects_.map(({Key,VersionId}) => {return {Key,VersionId}})
    console.log(`@63 listObjectVersions() => ${Objects.length}`)

    const params = {
      Bucket: 'abatros',
      Delete : {
        Objects
      }
    }

    const retv = await s3.deleteObjects(params)
    console.log(`@74 `,retv)
  })();


  ;(async ()=>{
return; // bugggg
    const make_pdf = require('./lib/make-pdf.js')
    const retv = await make_pdf('s3://caltek/books/101-dont-go-where');
    console.log(`@81 publish-pdf =>`,retv)
  })();


  ;await (async ()=>{
return;
    const Objects_ = await s3.__s3client.listObjectVersions({
      Bucket: 'blueink',
      Prefix: 'en/home',
      Delimiter: ''
    }).promise();
    console.log(`@93 listObjectVersions() => ${Objects_.length}`, Objects_)
    console.log(`@94 listObjectVersions() => `,Objects_.Versions.map(it=>(it.Key)))
    console.log(`@95 listObjectVersions() => `,Objects_.DeleteMarkers.map(it=>(it.Key)))
  })();

  ;await (async ()=>{
return;
    const Objects_ = await s3.listObjectVersions({
      Bucket: 'blueink',
      Prefix: 'en/home',
      Delimiter: ''
    });
    console.log(`@104 listObjectVersions() => ${Objects_.length}`, Objects_)
    const v = Objects_.map(it=>{return `${it.Key} type:${it.type}`});
    console.log(`@105 listObjectVersions() => `,v);
  })();


  ;await (async ()=>{
return;
    const Objects_ = await s3.listObjectVersions({
      Bucket: 'abatros',
      Prefix: 'projects/227-10',
      Delimiter: ''
    });
    console.log(`@104 listObjectVersions() => ${Objects_.length}`, Objects_)
    const v = Objects_.map(it=>{return `xx${it.Key} type:${it.type}`});
    console.log(`@105 listObjectVersions() => `,v);
  })();


  ;await (async ()=>{
return;
    const list = await s3.listObjectVersions2({
      Bucket: 'blueink',
      Prefix: 'en/home/',
      Delimiter: '/'
    });
    console.log(`@132 listObjectVersions2() => ${list.length}`)
    const x = list.map(it=>(`-- ${it.Key}(${it.ext}) ${it.dir?'--dir':''}`));
    x.forEach(it=>{
      console.log(it)
    })
  })();

  console.log(`@48 [${module.id}] Meteor.startup done.`)
});

Meteor.onConnection((x)=>{
  console.log(`@11: Meteor.onConnection x-real-ip:"${x.httpHeaders['x-real-ip']}" ${new Date().toLocaleString()}
  user-agent: ${x.httpHeaders['user-agent']}
  accept-language: ${x.httpHeaders['accept-language']}
  `)
})


Meteor.methods({
  'get-object-metadata': async (cmd) =>{
    try {
      const retv1 = await s3.getObjectMetadata(cmd);
      return retv1
    }
    catch(err) {
      return {error: 'file-not-found'}
    }
  },
  'get-s3object': async (cmd) =>{
    if (cmd.startsWith('s3://')) cmd = cmd.substring(5);
    if (cmd.startsWith('s3:/')) throw Meteor.Error('incorrect syntax s3:// need 2//')

    try {
      ;(verbose >0) && console.log(`@73 [${module.id}] get-s3object cmd:`,cmd)
      const retv1 = await s3.getObject(cmd);
      //console.log(`@74 get-s3object retv1:`, retv1)
      const {error, Bucket, Key, VersionId, data, etime, LastModified} = retv1;
      const retv2 = {Bucket, Key, error, VersionId, data, etime, LastModified};
      //console.log(`@77 get-s3object retv2:`, retv2)
      return retv2;
    }
    catch(err) {
      console.trace(`@61 method::get-s3object`)
      console.error(`@61 method::get-s3object `,{err})
      console.error(`@61 method::get-s3object  cmd:`,cmd)
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
      s3.putObject({s3_url, data})
//      utils.putObject({s3_url, data}); // this is able to set the mime-type
    }
    catch(err) {
      console.error(`@106 Method:commit-s3data `,{err})
      return {error:'sysError@106'}
    }
  }
});

Meteor.methods({
  'save-e3data': (cmd) =>{
    ;(verbose >0) && console.log(`@39: save-e3data cmd:`,cmd)
throw Meteor.Error('obsolete@119')
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
return;
  console.log(`@78 `,new s3path('s3://blueink/ya15').parent().add('ya14').add('index.html').value)
  if (new s3path('s3://blueink/ya15').parent().add('ya14').add('index.html').value != 's3://blueink/ya14/index.html') {
    console.log('FATAL @74'); process.exit();
  }
  console.log(`@86 test passed`)
})();


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


const publish_article = require('./lib/publish-article.js')

Meteor.methods({
  'publish-s3data': async (cmd) =>{
    const verbose =1;

    try {
      const {s3_url, update} = cmd;
      let {data} = cmd; // if no data we must fetch

      ;(verbose>0)&&
      console.log(`@279 putObject (${s3_url}) data.length:${data && data.length}`)

      if (data) {
        // save-it
        const retv1 = await s3.putObject({s3_url, data});
        ;(verbose>0)&&
        console.log(`@282 putObject (${s3_url}) => VersionId:`,retv1.VersionId)
      }

      const {ext} = parse_s3filename(s3_url);
      if (ext != '.md') {
        ;(verbose>0) && console.log(`@204 publish-s3data SAVED but thinks it is not publishable.`)
        return {
          error:null
        };
      }

      return publish_article(cmd);
    }
    catch (err) {
      console.error(`@349 Method:publish-s3data catch =>`,err)
      throw err;
    }
  } // publish-s3data
});



Meteor.methods({
  'e3list': (cmd) =>{
    throw new Meteor.Error('obsolete@417')
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


function get_pg_env_Obsolete() {
  const env1 = process.env.METEOR_SETTINGS && JSON.parse(process.env.METEOR_SETTINGS)
  if (env1) {
    // on the server
    const {PGUSER, PGPASSWORD} = env1;
    return {PGUSER, PGPASSWORD}
  }
  const {PGUSER, PGPASSWORD} = process.env;
  return {PGUSER, PGPASSWORD}
}

/******************
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
} *****************/


Meteor.methods({
  'get-s3object-versions': async (s3_url)=>{
      assert(s3_url, `@481 [${module.id}] missing argument`)
      const data = await s3.listObjectVersions(s3_url)

      /*
      data
      -- Name (Bucket name)
      -- Prefix
      ----- Versions []
      ------- ETag, Size, Key, VersionId, IsLatest, LastModified
      ----- DeleteMarkers []
      ------- Key, VersionId, IsLatest, LastModified
      ----- CommonPrefixes []
      */

      ;(verbose >0) && console.log(`@316 DeleteMarkers:`,data)


      return data;


//      return data.Versions;
      return data.Versions.map(it =>{
        const {ETag, IsLatest, LastModified, Size, VersionId} = it;
        return {ETag, IsLatest, LastModified, Size, VersionId}
      })
  }
})

// ---------------------------------------------------------------------------
async function listObjects_nofix(sdir) {
  const verbose =0;
  const x = util2.parse_s3filename(sdir);
  ;(verbose >0) && console.log(`@418 listObjects_nofix `,x)
  const {Bucket, Key:Prefix} = x;
//  const {dir:Prefix} = path.parse(Key);
  const Delimiter= '/';

  ;(verbose >0) && console.log(`@415 Bucket:<${Bucket}> Prefix:<${Prefix}> Delimiter:<${Delimiter}>`)
  const retv = await s3.readdir_nofix({
    Bucket,
    Prefix, //: (Prefix)?Prefix+'/':'',  // a tester
    Delimiter,
  })
  ;(verbose >0) && console.log(`@420 readdir_nofix =>`,{retv})
  /*
  const {Contents, CommonPrefixes, Prefix:Prefix2} = retv;
  Contents.forEach(it=>{
    console.log('Content:',it)
  })
  CommonPrefixes.forEach(it=>{
    console.log('CommonPrefix:',it)
  }) */

  ;(verbose >0) && console.log(`@428 readdir_nofix =>`,{retv})
  return retv;
}

// --------------------------------------------------------------------------

/*
    format2
    - remove extension; insert in h, with {ext}.
    - if no extension
        if (object) insert in h {ext:'***'}
        else with {dir:true}

    - an object-name could exist with several extensions.... !!!
    - ex: index.html, index.md.
    - in that case we create an entry for each extension (plus) an entry from folder.
*/

function reformat_s3list_format2(retv1) {
  const h={};

  const {Contents, CommonPrefixes, Prefix:_Prefix} = retv1;
  const plen2 = _Prefix.length;

  Contents.forEach(it =>{
    const {Key} = it;
    // filter objects with extensions.
    assert(Key.startsWith(_Prefix))
    const Key_ = Key.substring(plen2);
    //console.log(`@454 Key_${Key_}`)

    if (Key_) {
      const {ext, name} = path.parse(Key); // if no extension = (ext=='')
      h[name] = h[name] || {ext:[],xdir:[]};
      h[name].ext.push(ext);

      // it's OK to push (ext:'') when no extension... but there is an object.
      //if (ext.length >0) h[name].ext.push(ext);
      //else h[name].ext.push('***');
      //console.log(`@455 h[${name}]:`,h[name])
    }
  })
  CommonPrefixes.forEach(it =>{
    // folders (non objects)
    let {Prefix:fn} = it;
    assert(fn.startsWith(_Prefix))

    if (false) {
      // remove Prefix "np/12" !!!!!!!!
      // remove only "np/"
      const v = Prefix_.split('/');
      const prefix_ = s.splice(-1,1); // last
      const _Prefix = s.join('/')
      // here _Prefix is "np" : this is what we need to remove.

      // remove tailing '/'
      let Prefix_ = fn.substring(plen2).slice(0,-1);
    }

    const {dir,base:Prefix_} = path.parse(fn);

    if (Prefix_) { // important
      // possible extension like 'blueink/en/home.html/index.md' is ignored
      const {ext, name} = path.parse(Prefix_); // if no extension = (ext=='')
      h[Prefix_] = h[Prefix_] || {ext:[],xdir:[]};
      h[Prefix_].xdir.push(ext);
      //console.log(`@459 h[${Prefix}]:`,h[Prefix])
    }
  })

  if (true) {
    const v = Object.keys(h).sort()
    return v.map(fn => (Object.assign(h[fn],{fn})))
  }


throw 'fatal@470'

  const list =[];
  Object.keys(h).sort().forEach((key, i) => {
    const it = h[key]
    if (!it.ext || it.ext.length <=0) {
      assert(it.dir)
      list.push({fn:key, dir:true})
    } else if (it.ext.length ==1) {
      list.push({fn:key+it.ext[0], ext:it.ext[0], dir:it.dir})
    } else {
//      list.push({fn:key, dir:true})
      it.ext.forEach(ext =>{
        list.push({fn:key+ext, ext, dir:it.dir})
      })
    }
//    console.log(`@475 h[${key}]`,it)
//    console.log(`@476 =>`,list[list.length-1])
  }); // for each key in h


  console.log(`@477 `,{list})
//  console.log(`@478 `,{Contents})
//  console.log(`@479 `,{Contents})
  return list;
}


function reformat_s3list(retv1) {
  const h={};
  const _list =[];
  const {Contents, CommonPrefixes, Prefix:_Prefix} = retv1;
  const plen2 = _Prefix.length;

  Contents.forEach(it =>{
    const {Key} = it;
    // filter objects with extensions.
    assert(Key.startsWith(_Prefix))
    const Key_ = Key.substring(plen2);
    if (Key_) {
      _list.push({Key: Key_}) // only Key....

      const {ext,name} = path.parse(Key);
      if (ext && (ext == '.md')) {
        // store MD-entry with the associated folder.
        h[name] = h[name] || {};
        Object.assign(h[name], {md:true})
      } else {
        h[Key_] = h[Key_] || {};
        Object.assign(h[Key_], {o:true})
      }
    }
  })
  CommonPrefixes.forEach(it =>{
    const {Prefix} = it;
    // remove Prefix
    assert(Prefix.startsWith(_Prefix))
    let Prefix_ = Prefix.substring(plen2).slice(0,-1);
    if (Prefix) { // important
      _list.push({Prefix:Prefix_})
      h[Prefix_] = h[Prefix_] || {};
      Object.assign(h[Prefix_], {d:true})
    }
  })

  return {h,_list};
}


Meteor.methods({
  'list-s3objects': async (p1)=>{
    const verbose =1;

    ;(verbose >0) && console.log(`@572 Entering list-s3objects =>`,p1)
    if(typeof p1 == 'string') {p1 = parse_s3filename(p1);}

    ;(verbose >0) && console.log(`@573 Entering list-s3objects =>`,p1)

    let {Bucket, Key, Prefix=Key, Delimiter='/'} = p1; // only 1 level
    assert(Bucket)
    //assert(Prefix) prefix could be nulll ex: s3://abatros

    /*

        TRICKY:
        Prefix.endsWith(/)  => remove (/); delimiter := (/)

    */

    //Prefix = Prefix.replace(/\/$/,'')

    const params = {
      Bucket,
      Prefix,
      Delimiter
    };

    ;(verbose >0) && console.log(`@513 list-s3objects params:`,params)

    const retv1 = await s3.readdir_nofix(params)


    ;(verbose >0) && console.log(`@457 list-s3objects =>`,{retv1})
    const {Contents, CommonPrefixes, Prefix: _Prefix, Keys} = retv1;

    /*
          Contents => Key, VersionId, ETag, LatModified
          Keys = Contents.Key
          CommonPrefixes => list of folders.
    */

    const list = reformat_s3list_format2(retv1)

//    console.log(`@418 `,{_list},{h})

    /********************************************

    Here: each dir-entry is
      {fn, ext, dir}  note: fn include extension

      {fn:home/, ext:null, dir:true}
      {fn:home.html, ext:'.html', dir:false}
      {fn:home.md, ext:'.md', dir:false}

      we could have:
      {fn:contact.html, ext:'.html', dir:true}
      if there is some files under contact/

    *********************************************/


    const retv = {
      Prefix:_Prefix,
      list:list,
      error:null,
    }
    return retv;
  }
})

// --------------------------------------------------------------------------

/*
      include Objects without extension
      include prefix
*/

Meteor.methods({
  'list-md-files': async (p1)=>{
    throw new Meteor.Error('forced exit','Obsolete method <list-md-files>','my-details')
    return;

    if(typeof p1 == 'string') {
      if (!p1.startsWith('s3://')) {
//        assert(!p1.startsWith('s3:/')) // !!!!
        if(p1.startsWith('s3:/')) {
          return {
            error:'syntax-error',
            s3fn: p1
          }
        }
      }
      p1 = parse_s3filename(p1);
    }


    // accept (Key == null)
    ;(verbose >0) && console.log(`@479 Entering <list-md-files> p1:`,p1)

//    const {Bucket, Key, Prefix=Key, Delimiter = '/index.md'} = p1;
    const {Bucket, Key,
      Prefix= (Key)?Key+'/':'',
      Delimiter = '/'} = p1;
    assert(Bucket)
//    assert(Prefix)

    const retv1 = await s3.readdir_nofix({
      Bucket,
      Prefix,
      Delimiter
    })

    ;(verbose >0) && console.log(`@449 list-s3objects =>`,{retv1})
    const {Contents, CommonPrefixes, Prefix: _Prefix} = retv1;

    const h={};
    const _list =[];
    const plen2 = _Prefix.length;

    Contents.forEach(it =>{
      const {Key} = it;
      // filter objects with extensions.
      const {ext} = path.parse(Key);
      if (!ext) {
        // remove Prefix
        assert(Key.startsWith(_Prefix))
        /*
            Objects here are md-files => add ('/')
        */
        const Key_ = Key.substring(plen2);
        _list.push({Key: Key_}) // only Key....
        h[Key_] = h[Key_] || {};
        Object.assign(h[Key_], {o:true})
      }
    })
    CommonPrefixes.forEach(it =>{
      const {Prefix} = it;
      // remove Prefix
      assert(Prefix.startsWith(_Prefix))
      let Prefix_ = Prefix.substring(plen2).slice(0,-1);
      _list.push({Prefix:Prefix_})
      h[Prefix_] = h[Prefix_] || {};
      Object.assign(h[Prefix_], {d:true})
    })



    const retv = {
      Prefix:_Prefix,
      list:_list,
      error:null,
      h: Object.entries(h)
    }
    return retv;


    /***********************************
    const plen = _prefix.length;
    const list = CommonPrefixes.map(it => {
      console.log(it)
      const {dir,base} = path.parse(it.Prefix);
//      const {base} = path.parse(dir);
      // remove prefix.
//      assert(dir.startsWith(_prefix))
//      return {Key:dir.substring(plen)}
      return {Key:base}
    });

    return {list, // [{Key,Prefix,name}]
      error:null,
      Prefix: _prefix,
    };
    ****************/
  }
})


Meteor.methods({
  'subsite-directory': async (sdir)=>{
    return Meteor.Error('Obsolete method <subsite-directory>')
    // FULL DIRECTORY

    const verbose =0;
    try {
      ;(verbose >0) &&console.log(`@529 Entering subsite-directory <${sdir}>`)

      assert (typeof sdir == 'string')
      if (!sdir.startsWith('s3://')) {
        assert(!sdir.startsWith('s3:/')) // !!!!
      }

      const retv1 = await listObjects_nofix(sdir);
      ;(verbose >0) && console.log(`@539 `,{retv1})
      const {Contents, CommonPrefixes, Prefix:_Prefix} = retv1;

      /*
          client expect:
            list = [{}]
      */

      const _list =[];
      const plen2 = _Prefix.length;

      Contents.forEach(it =>{
        const {Key} = it;
        // remove Prefix
        assert(Key.startsWith(_Prefix))
        _list.push({Key: Key.substring(plen2)}) // only Key....
      })
      CommonPrefixes.forEach(it =>{
        const {Prefix} = it;
        // remove Prefix
        assert(Prefix.startsWith(_Prefix))
        _list.push({Prefix:Prefix.substring(plen2)})
      })

      const retv = {
        Prefix:_Prefix,
        list:_list,
        error:null
      }
      return retv;

      throw new Meteor.Error('workingbreak@540');
// ==========================

      const {base, ext} = util2.parse_s3filename(sdir);
      if (ext) {
        return await listObjects_nofix('s3://blueink/ya14');
//        return await listObjects_nofix(sdir);
      }

      const {list:list_, Prefix} = await s3.readdir(sdir)
      if (!list_) {
          return {error:'empty-list', list:null}
      }
      ;(verbose >0) &&console.log(`@367 subsite-directory prefix:(${Prefix})`,{list_})

      const {Bucket,subsite} = util2.extract_xid2(sdir)

      const plen = Prefix.length;
      const list = list_.map((it) =>{
        // { Prefix: 'projects/227-blueink-db/' }
        const {Key:_key, ETag, LastModified, Prefix:_prefix} = it; // exclusive
        if (_key) {
          assert(_key.startsWith(Prefix))
          const Key = _key.substring(plen)
          return {Key,ETag, LastModified}
        } else if (_prefix) {
          assert(_prefix.startsWith(Prefix))
          const _Prefix = _prefix.substring(plen)
          return {Prefix:_Prefix}
        }
      })

      ;(verbose >0) &&console.log(`@449 subsite-directory:`,{list})
      ;(verbose >0) &&console.log(`@450 subsite-directory ${list.length} rows.`)
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
    const verbose =0;
    // make sense only for index.md
    // template url is in <subsite>/.publish.yaml
    try {
      const {Bucket,subsite} = util2.extract_subsite(s3_url);
      const yaml_fn = path.join(Bucket,subsite,'.publish.yaml')
      ;(verbose>0) && console.log(`@227: `,{yaml_fn})
      const {data:cfg} = await utils.get_yaml_object(yaml_fn);
      ;(verbose>0) && console.log(`@421 `,{cfg})

      const {template:template_fn} = cfg;
      ;(verbose >0) && console.log(`@428 `,{template_fn})

      const retv = await s3.getObject(template_fn)
      ;(verbose >0) && console.log(`@429 `,{retv})
      const {Body, ETag, VersionId} = retv;
      if (!ETag) throw '@432 file-not-found'


//      const retv2 = await s3.getObject('s3://abatros/projects/mk-html.js')
      const retv2 = await s3.getObject('s3://blueink/ya14/mk-html.js')
      ;(verbose >0) && console.log(`@435 `,{retv2})
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
  'delete-s3object': async (params)=>{
    if (typeof params === 'string') {params = parse_s3filename(params)}
    const {Bucket, Key, VersionId, BypassGovernanceRetention=false} = params;

    ;(verbose >=0) && console.log(`@505 delete-object <${Bucket}><${Key}><${VersionId}>`)

    if (false) {
      params = {Bucket, Delete: {
        Objects: [{Key}],
        Quiet: false
      }};
      const data = await s3.deleteObjects(params);
      console.log(`@848 deleted version <${data.VersionId}>`)
      return data; //{VersionId: data.VersionId}
    }

    params = {Bucket, Key, VersionId, BypassGovernanceRetention};
    const data = await s3.deleteObject(params);
    console.log(`@853 deleted version <${data.VersionId}>`)
    return data; //{VersionId: data.VersionId}
  }
})

/*
Meteor.methods({
  'delete-s3objects': async (params)=>{
    assert (typeof params != 'string');

    const {Bucket, Delete} = params;

    console.log(`@505 delete-object <${Bucket}><${Key}><${VersionId}>`)

    params = {Bucket, Key, VersionId};
    const data = await s3.deleteObject(params);
    console.log(`@477 deleted version <${data.VersionId}>`)
    return data; //{VersionId: data.VersionId}
  }
})*/


// --------------------------------------------------------------------------

Meteor.methods({
  'publish-index': async (p1)=>{
    const verbose =1;

    assert(typeof p1 == 'string')

    p1 = parse_s3filename(p1)

    ;(verbose >0) && console.log(`@447 Entering publish-index =>`,p1)

    const {Bucket, Key, Delimiter = '/'} = p1; // only 1 level
    assert(Bucket)
    //assert(Prefix) prefix could be nulll ex: s3://abatros

    const retv1 = await s3.readdir_nofix({Bucket,Prefix:Key,Delimiter})

    ;(verbose >0) && console.log(`@457 list-s3objects =>`,{retv1})
    const {Contents, CommonPrefixes, Prefix: _Prefix} = retv1;

    const {h} = reformat_s3list(retv1)
    // take only the md files (or) take

    const html_list = Object.entries(h).filter(([fname,o])=>{
    	return (o.md || o.d); // must be object (and) have associated MD.
    });


    const yaml_fn = path.join(Bucket,Key,'.publish.yaml')
    ;(verbose >=0) && console.log(`@227 [${module.id}] lookup config <${yaml_fn}>`)

    const retv2 = await s3.getObject(yaml_fn);
    assert(retv2.Body)
    if (!retv2.data) {
      console.log(`@783 `,{retv2})
    }
//    let publish_cfg = yaml.safeLoad(retv1.Body.toString('utf8'),'utf8')
    const publish_cfg = yaml.safeLoad(retv2.data,'utf8')
    const {'root-url':root_url} = publish_cfg;
    assert(root_url)
    console.log(`@789 `,{root_url})


    const index =[];

    console.log({html_list})
    html_list.forEach(([xid,o]) =>{
      console.log(xid,o)
      if (o.md) {
        index.push(`<div><a href="${root_url}/${xid}">${xid}</a></div>`);
      } else if (o.d) {
        index.push(`<div>DIR <a href="${root_url}/${xid}">${xid}</a></div>`);
      }
    })


    console.log({index})
    const retv3 = await s3.putObject({
      Bucket,
      Key: path.join(Key,'index.html'),
      Body: `<html><h1>${root_url}</h1>\n${index.join('\n')}</html>`,
      ACL: 'public-read',
      ContentType: 'text/html;charset=utf8;',
      ContentEncoding : 'utf8',
    })

    console.log(`@391 write_html_index =>`, Object.assign(retv3,{Bucket,Key,root_url}))

return {error: 'break@764'};

    const plen2 = _Prefix.length;

    Contents.forEach(({Key}) =>{
//      console.log({it})
//      const {Key} = it;
      assert(Key.startsWith(_Prefix))
      const Key_ = Key.substring(plen2);

      const {ext,name, base} = path.parse(Key);
      if (ext && (ext == '.md')) {
        index.push(name);
      }
    }) // each KEY


   ;(verbose >1) && console.log(`@952 publish-index `, index)
    ;(verbose >0) && console.log(`@955: `,{Bucket},{Key})
    const yaml_fn2 = path.join(Bucket,Key,'.publish.yaml')
    let {data:publish_cfg2} = await utils.get_yaml_object(yaml_fn);
    //;(verbose>1) &&
    console.log(`@958 `,publish_cfg)
    const {'root-url':root_url2} = publish_cfg;
    console.log(`@959 root_url:${root_url}`); // where to add Key.
    if (!root_url) {
      throw 'fatal@960'
    }


    const Key_ = (Key.endsWith('/'))? Key.slice(0,-1): Key;
    const ul2 = index.map((xid,j) =>{
      // NO "/" between Key and xid
      return `<div>${j} <a href="${root_url}/${Key_}/${xid}">${xid}</a></div>`
    }).join('\n')

    //console.log({ul})
    const retv = await s3.putObject({
      Bucket,
      Key:Key_,
      Body: `<html>\n${ul}</html>`,
      ACL: 'public-read',
      ContentType: 'text/html;charset=utf8;',
      ContentEncoding : 'utf8',
    })

    console.log(`@391 write_index =>`, Object.assign(retv,{Bucket,Key,root_url}))

//..................................................
//    await write_index(path.join(Bucket,Key), _list)
//    await write_index(path.join(Bucket,Key), _list)
return;



/*
    const custom = utils.setCustom(publish_cfg.format)
    if (!custom) throw `No custom for <${publish_cfg.format}>`

    const {mk_index} = custom;
    assert(mk_index, `Missing-hook mk_index`)
    custom.mk_index(path.join(Bucket,Key),_list)
*/

    /********************************************


    *********************************************/

    /*
    const h_ = Object.entries(h).map(([fname,o])=>{
      if (o.md && !o.d) {
        fname += '.md'; // !!!!!!!!!!!!!!!!!!!!
        o.md = false; // not a read MD
      }
      return {fname,o}
    });
    ;(verbose >0) && console.log(`@497 list-s3objects h =>`,h_)

    const retv = {
      Prefix:_Prefix,
      list:_list,
      error:null,
      h: h_
    }
    return retv;
    */
  } // publish-index
})

// ---------------------------------------------------------------------------

/*

    How to go from {Bucket:blueink, Key:np} to "http://ultimheat.co.th/np"
    Check publish.yaml

*/

async function write_index(o_path, index) {
  if (o_path.endsWith('/')) o_path = o_path.slice(0,-1)
  console.log(`@424 make_index(${o_path})`,index)

  const ul = index
  .map((xid,j) =>{
//    const fname = it.Prefix.substring(5).replace('/index.html','');
//    const {xid,title} = it;
    return `<div>${j} <a href="https://ultimheat.co.th/n/${xid}">${xid}</a></div>`
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

// -------------------------------------------------------------------------


Meteor.methods({
  'sign-up': async (params)=>{
    const {oneTimeCode, userId} = params;
    const verbose =0;
    const retv = await s3.getObject({
      Bucket: 'publibase',
      Key: `users/${oneTimeCode}.yaml`
    })
    retv.data = yaml.safeLoad(retv.data);
    console.log({retv})
    return retv;
  }

});
