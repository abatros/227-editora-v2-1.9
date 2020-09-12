const yaml = require('js-yaml')
const assert = require('assert')
const path = require('path')

// ---------------------------------------------------------------------------

function parse_s3filename(s3fn) {
  const verbose =0;

  // remove protocol if present.
  if (s3fn.startsWith('s3://')) s3fn = s3fn.substring(5);

  ;(verbose >0) && console.log(`@13 >>>> `,{s3fn})

  const _v = s3fn.split('/');
  const Bucket = _v.splice(0,1)[0];
  const Key = _v.join('/');
  console.log(`@16 _v.len:${_v.length} `,{_v})

  const {dir, base, name, ext} = path.parse(Key);

//  if (s3fn.endsWith('.md'))
  if (ext)
    {
    // ex: blueink/ya14/1202-Y2K3/index.md
//    const {dir:dir1, base} = path.parse(s3fn);
    // here: dir: blueink/ya14/1202-Y2K3
    // remove Bucket
    _v.splice(-1,1); // remove base
    let xid = _v.splice(-1,1)[0];
    let subsite = _v.join('/')
//    const {dir:dir2, base:xid} = path.parse(dir);
    // xid: 1202-Y2K3 - dir2: blueink/ya14
    // remove
//    const subsite = dir2.split('/').slice(1).join('/');
//    const {dir:} = path.parse(dir2)

    if (!subsite) {
      subsite = xid; xid=''; //swap
    }

    const retv = {
      s3fn,
      Bucket, Key,
//      Key: path.join(subsite,xid,base),
      subsite, xid, base, ext
    }
    ;(verbose >0) && console.log(`@30 `,{retv})
    return retv;
  } // ext


  // here NO ext
  // s3://blueink/ya14 = > dir:null base:'ya14' => subsite := base <>'ya14'
  // s3://blueink/ya14/1202-Y3K2 = > dir:ya14 base:'1202-y3k2' => subsite := dir <>'ya14'


  const retv2 = {
    s3fn, Bucket, Key,
    dir, base, name, ext,
    subsite: null, // don't try to be smart!
    xid: null,
  }
  ;(verbose >0) && console.log(`@58 (directory) `,{retv2})
  return retv2;


  throw 'break@56'
// ===========================================
  // console.log(`@45 `,{Bucket},{Key},{dir},{base},{name},{ext})

  // here NO EXT non-publishable file => just extract Bucket/Key
  // HERE _v is Key

  // remove tailing '/'

  //console.log(`@53 last:<${_v[-1]}> _v.len:${_v.length} `,{_v})
  if (! _v[_v.length-1]) {
    //console.log(`@62 <${_v.join('|')}>`)
    _v.splice(-1,1); // tricky....................
    //console.log(`@63 <${_v.join('|')}>`)
  }
  let xid = _v.splice(-1,1)[0];
  ;(verbose >0) && console.log(`@54 _v.len:${_v.length} `,{_v},{xid})
  let subsite = _v.join('/')
  ;(verbose >0) && console.log(`@55 _v.len:${_v.length} `,{_v},{subsite})

  const retv = {
    s3fn, Bucket, Key,
    base: null,
    subsite,
    xid,
    ext: null, // not '' ???
  }
  ;(verbose >0) && console.log(`@58 (directory) `,{retv})
  return retv;

} // parse_s3_filename



// ---------------------------------------------------------------------------

function extract_metadata(s) {
  s = s.replace(/^\s+/,'')
  if (!s.startsWith('---')) {
    return {meta:null, md:s}
  }


  const v = s.split(/^\-\-\-/gm) // treat as multiline
  switch (v.length) {
    case 1:
      return {meta:{}, md:v[1], error:'no-meta'}
    case 3: {
//      console.log(`@17 v[1]:`,v[1])
      const vv = v[1].split('\n')
      vv.forEach((li,j) =>{
//        console.log(`@18 XXXXXXXXXXXXXXXXXXXX `,{li},{j})
        const new_li = li.replace(/^(\t+)/, (match,$1)=>{
//          console.log(`@19 XXXXXXXXXXXXXXXXXXXX `,{match},{$1})
          return $1.replace('\t','  ')
        })
        vv[j] = new_li
      })
      /*
      const v1 = v[1].replace(/^(\t+)(.*)/gm, (match,$1,$2,offset,string)=>{
        console.log(`@19 `,{match},{$1},{$2},{string})
        return `  ${string}`
      })*/

      const v1 = vv.join('\n')
//      console.log(`@18 v1:`,v1)
      const meta = yaml.safeLoad(v1)
      return {meta, md:v[2], error:null}
    }
  }

  return {error: {
    code:'Invalid MD-format',
    v}};
} // extract-metadata


;(()=>{
  const head = 'title: a-title';
  const {meta, md, error} = extract_metadata(`---\n${head}\n---\n# headline`)
  console.log(`@43 `,{meta},{md},{error})
  assert(! error);
})();

;(()=>{
  const head = 'title: a-title';
  const {meta, md, error} = extract_metadata(`---\n${head}\n---\n# headline\n --- \n`)
  console.log(`@50 `,{meta},{md},{error})
  console.assert(!error, {meta},{md},{error})
  assert(! error);
})();


// ------------------------------------------------------------------------

function extract_meta_Obsolete(s) {
  const v = s.split(/\-\-\-/g)
  switch (v.length) {
    case 1:
      console.log(`alert `,v)
      console.log(`alert s:`,s)
      return {meta:{}, md:v[0], err:null}
    case 3: {
      const meta = yaml.safeLoad(v[1])
      return {meta, md:v[2], err:null}
    }
  }

  return ({err:'Invalid MD-format'});
} // extract-metadata

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


/***************************************************************************

const {Bucket,subsite,xid,fn} = extract_xid2(s3fn)

blueink/ya14/1202-Y3K2/index.md => {blueink | ya14 | 1202-Y3K2 | index.md}

abatros/project/dkz/.publish.yaml => {abatros | project | dkz | .publish.yaml}

must have xid to publish else just save-s3object

****************************************************************************/

function extract_xid2(s3fn) {
  if (s3fn.startsWith('s3://')) s3fn = s3fn.substring(5);
  const v = s3fn.split('/');
  const k = v.length;
  const Bucket = v[0];

  if (v[k-1] == 'index.md') { // most frequent
    const subsite = v.slice(1,k-2)
    return {
      Bucket,
      subsite: subsite.join('/'),
      xid: v[k-2],
      fn: v[k-1]
    };
  }


  const xfound = ['.md','.yaml','.html','.css','.js','txt','.tex'].filter((ext)=>{
      return (v[k-1].endsWith(ext))
    })

  assert(xfound, '@120 extract_xid2 fatal')
  assert(xfound.length <2, `@121 extract_xid2 fatal v.length:${xfound.length}`)
  if (xfound.length ==1) {
    const subsite = v.slice(1,k-1)
    return {
      Bucket,
      subsite: subsite.join('/'),
      xid: null, // means no publish html
      fn: v[k-1]
    };
  }



  if (v[k-1].startsWith('index')) { // for index.html or ????
    const subsite = v.slice(1,k-2)
    return {
      Bucket,
      subsite: subsite.join('/'),
      xid: v[k-2],
      fn: v[k-1]
    };
  }


  /************
    looks like a directory. => fn:null
  *************/

  const subsite = v.slice(1,k-1)
//  console.log({subsite})
  return {
    Bucket,
    subsite: subsite.join('/'),
    xid: v[k-1],
    fn:null
  };
}

(()=>{
  const s3path = 's3://blueink/ya14/1202-Y3K2/index.md'
  const {Bucket,subsite,xid} = extract_xid2(s3path);
  assert((Bucket == 'blueink'),s3path)
  assert(subsite == 'ya14',s3path)
  assert(xid == '1202-Y3K2',s3path)
  console.log(`@110 [${module.id}] test passed <${s3path}>`)
})();

(()=>{
  const s3path = 's3://blueink/np/ya14/1202-Y3K2/index.md'
  const {Bucket,subsite,xid} = extract_xid2(s3path);
  assert((Bucket == 'blueink'),s3path)
  assert(subsite == 'np/ya14',s3path)
  assert(xid == '1202-Y3K2',s3path)
  console.log(`@110 [${module.id}] test passed <${s3path}>`)
})();

(()=>{
  const s3path = 's3://abatros/project/dkz/227-editora-intro';
  const {Bucket,subsite,xid} = extract_xid2(s3path);
  assert(Bucket == 'abatros',s3path)
  assert(subsite == 'project/dkz',s3path)
  assert(xid == '227-editora-intro',s3path)
  console.log(`@120 [${module.id}] test passed <${s3path}>`)
})();

(()=>{
  const s3path = 's3://abatros/project/dkz/.publish.yaml';
  const {Bucket,subsite,xid} = extract_xid2(s3path);
  assert(Bucket == 'abatros',s3path)
  assert(subsite == 'project/dkz',s3path)
  assert(xid == null,s3path)
  console.log(`@181 [${module.id}] test passed <${s3path}>`)
})();

(()=>{
  const s3path = 's3://abatros/project/.publish.yaml';
  const {Bucket,subsite,xid} = extract_xid2(s3path);
  assert(Bucket == 'abatros',s3path)
  assert(subsite == 'project',s3path)
  assert(xid == null,s3path)
  console.log(`@181 [${module.id}] test passed <${s3path}>`)
})();


(()=>{
  const s3path = 's3://abatros/yellow/.publish.yaml';
  const {Bucket,subsite,xid,fn} = extract_xid2(s3path);
  assert(Bucket == 'abatros',s3path)
  assert(subsite == 'yellow',s3path)
  assert(xid == null,s3path)
  assert(fn == '.publish.yaml',fn)
  console.log(`@200 [${module.id}] test passed <${s3path}>`)
})();

// -----------------------------------------------------------------------

function s3fn_to_url(s3fn) {
  if (s3fn && s3fn.endsWith('.md')) {
    const {Bucket, subsite, xid} = extract_xid2(s3fn)
    s3fn = `https://${Bucket}.com/${subsite}/${xid}`; // ~~~~~~~ to be fixed.
  }
  return s3fn;
}


// ------------------------------------------------------------------------


class s3parser {
  constructor(p) {
    this.value = p;
    return this;
  }
  add(i) {
    const v = this.value.split('/').push(i)
    this.value = v.join('/')
    return this;
  }
  parent() {
    const v = this.value.split('/');
    if(v.length>3) v.length = v.length -1;
    this.value = v.join('/')
    return this;
  }
  replace(q) {
    const v = this.value.split('/');
    v[-1] = q;
    this.value = v.join('/')
    return this;
  }
  remove(q) {
    const v = this.value.split('/');
    if (v[-1] == q) v.length = v.length-1;
    this.value = v.join('/')
    return this;
  }

  parse(p) {
    const v = p.match(/s3:\/\/([^\/]+)\/(.+)$/)
    if (v && v.length ==3) {
      const Key = v[2];
      const {dir,name} = path.parse(Key);
      return {
        Bucket: v[1], Key, dir, name
      }
    }
    return {Bucket:null, Key:null}
  }
};

// ------------------------------------------------------------------------


function assert_type(value, type, xmsg) {
  if (typeof value !== 'string')
  throw new Meteor.Error('sys-error','',xmsg)
}

// ------------------------------------------------------------------------

function s3fix(p) {
  if (! p.startsWith('s3://')) p = 's3://' + p;
  return p;
}


// -------------------------------------------------------------------------


// -------------------------------------------------------------------------

module.exports ={
  extract_metadata,
  extract_xid,
  extract_xid2, extract_subsite:extract_xid2,
  s3fn_to_url,
  s3parser,
  assert_type,
  s3fix,
  parse_s3filename,
}

// -------------------------------------------------------------------------

return;
(()=>{
  const s3fn = 's3://blueink/ya14/1202-Y3k2/index.md';
  const {Bucket,Key, subsite,xid,base} = parse_s3filename(s3fn)
  assert((Bucket == 'blueink'))
  assert((Key == 'ya14/1202-Y3k2/index.md'), `actual:${Key}`)
  assert((subsite == 'ya14'), `actual:${subsite}`)
  assert((xid == '1202-Y3k2'), `actual:${xid}`)
  assert((base == 'index.md'), `actual:${base}`)
})();


(()=>{
  const s3fn = 'blueink/ya14/1202-Y3k2/index.md';
  const {Bucket,Key, subsite,xid,base} = parse_s3filename(s3fn)
  assert((Bucket == 'blueink'))
  assert((Key == 'ya14/1202-Y3k2/index.md'))
  assert((subsite == 'ya14'))
  assert((xid == '1202-Y3k2'))
  assert((base == 'index.md'))
})();


(()=>{
  const s3fn = 's3://blueink/ya14/tests/1202-Y3k2/index.md';
  const {Bucket,Key, subsite,xid,base} = parse_s3filename(s3fn)
  assert((Bucket == 'blueink'))
  assert((Key == 'ya14/tests/1202-Y3k2/index.md'))
  assert((subsite == 'ya14/tests'))
  assert((xid == '1202-Y3k2'))
  assert((base == 'index.md'))
})();


(()=>{
  const s3fn = 'blueink/ya14/1202-Y3k2/index.html';
  const {Bucket,Key, subsite,xid,base,ext} = parse_s3filename(s3fn)
  assert((Bucket == 'blueink'))
  assert((Key == 'ya14/1202-Y3k2/index.html'))
  assert((subsite == 'ya14'))
  assert((xid == '1202-Y3k2'))
  assert((base == 'index.html'), `actual ${base}`)
  assert((ext == '.html'))
})();


(()=>{
  const s3fn = 's3://blueink/ya14/1202-Y3k2/index.html';
  const {Bucket,Key, subsite,xid,base,ext} = parse_s3filename(s3fn)
  assert((Bucket == 'blueink'))
  assert((Key == 'ya14/1202-Y3k2/index.html'))
  assert((subsite == 'ya14'))
  assert((xid == '1202-Y3k2'))
  assert((base == 'index.html'), `actual ${base}`)
  assert((ext == '.html'))
})();

(()=>{
  const s3fn = 's3://blueink/ya14/1202-Y3k2';
  const {Bucket,Key, subsite,xid,base,ext} = parse_s3filename(s3fn)
  assert((Bucket == 'blueink'))
  assert((Key == 'ya14/1202-Y3k2'))
  assert((subsite == 'ya14'))
  assert((xid == '1202-Y3k2'))
  assert((base == null), `actual ${base}`) // base is an object.
  assert((ext == null))
})();
