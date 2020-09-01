const yaml = require('js-yaml')
const assert = require('assert')


function extract_metadata(s) {
  const v = s.split(/^\-\-\-/gm) // treat as multiline
  switch (v.length) {
    case 1:
      console.log(`alert `,v)
      console.log(`alert s:`,s)
      return {meta:{}, md:v[0], error:'no-meta'}
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

  if (v[k-1].startsWith('index')) { // for index.html or ????
    const subsite = v.slice(1,k-2)
    return {
      Bucket,
      subsite: subsite.join('/'),
      xid: v[k-2],
      fn: v[k-1]
    };
  }

  if (v[k-1].endsWith('.md')) { // any md-file
    const subsite = v.slice(1,k-2)
    return {
      Bucket,
      subsite: subsite.join('/'),
      xid: v[k-2],
      fn: v[k-1]
    };
  }

  if (v[k-1].endsWith('.html')) { //
    const subsite = v.slice(1,k-2)
    return {
      Bucket,
      subsite: subsite.join('/'),
      xid: v[k-2],
      fn: v[k-1]
    };
  }

  if (v[k-1].endsWith('.yaml')) { //
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
  assert(subsite == 'project',s3path)
  assert(xid == 'dkz',s3path)
  console.log(`@181 [${module.id}] test passed <${s3path}>`)
})();

(()=>{
  const s3path = 's3://abatros/project/.publish.yaml';
  const {Bucket,subsite,xid} = extract_xid2(s3path);
  assert(Bucket == 'abatros',s3path)
  assert(subsite == '',s3path)
  assert(xid == 'project',s3path)
  console.log(`@181 [${module.id}] test passed <${s3path}>`)
})();


(()=>{
  const s3path = 's3://abatros/yellow/.publish.yaml';
  const {Bucket,subsite,xid,fn} = extract_xid2(s3path);
  assert(Bucket == 'abatros',s3path)
  assert(subsite == '',s3path)
  assert(xid == 'yellow',s3path)
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

module.exports ={
  extract_metadata,
  extract_xid,
  extract_xid2,
  s3fn_to_url,
  s3parser
}
