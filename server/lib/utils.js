const fs = require('fs')
const assert = require('assert')
const yaml = require('js-yaml')
const path = require('path')
const s3 = require('./aws-s3.js')(process.env); // for s3-Keys



module.exports = {
  extract_meta,
  absolute_path,
  get_publish_yaml,
  read_directory,
}


function extract_meta(s) {
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


/*
function safeLoad_md(data) {
  const v = data.split('\-\-\-')
  assert(v.length == 3, `@38 v.length:${v.length}`)
  assert(v[0].trim().length ==0, '@39')
  const meta = yaml.safeLoad(fix_metadata(v[1]))
  const md = v[2]
  return {meta, md}
}
*/


function fix_metadata(s) { // escape ":"
  const v = s.split('\n');
  v.forEach((li,j) =>{
  //    v[j] = li.replace(/^([^:]*):\s*/gm,'$1<<>>').replace(/:/g,'~!~').replace(/<<>>/g,': ')
    v[j] = li.replace(/^([^:]*):\s*/gm,'$1<<>>').replace(/:/g,' ').replace(/<<>>/g,': ')
  })
  return v.join('\n')
}


function absolute_path(fname) {
  if (!fname) return;

  if (fname.match(/^\.{1,2}\//)) {
    return path.join(process.cwd(),fname);
  }
  if (fname.startsWith('/')) return fname;

  return path.join(process.cwd(),fname);
}

// --------------------------------------------------------------------------

async function get_publish_yaml(root) {
  const verbose =1;

  ;(verbose >0) && console.log(`@426 Entering get_config(${root})`)

  if (root.startsWith('s3://')) {
    if (!root.endsWith('/.publish.yaml')) root += '/.publish.yaml';

    const retv = await s3.getObjectMetadata(root)
    ;(verbose >0) && console.log(`@340 `,retv)
//    console.log(`@341 `,retv.code)
    if (retv.error) {
      console.log(`@341 `,retv.error.code)
      console.log(`@341 `,retv.error.statusCode)
      return {env:null, fname:root};
    }

    const retv2 = await s3.getObject(root)
    if (retv.error) {
      console.log(`@341 `,retv.error.code)
      console.log(`@341 `,retv.error.statusCode)
      return {env:null, fname:root};
    }

//    throw 'break@388 -- return data'
    assert(retv2.Body)
    const env = yaml.safeLoad(retv2.Body.toString('utf8'),'utf8')
    return {env,fname:root};
  }

  if (!fs.existsSync(root)) return {
    error:`<${root}> file-not-found@330`,
    fname:root
  };

  const stat = fs.statSync(root);
  if (!stat.isDirectory()) return{
    error:'folder-not-found@331',
    fname:root
  }

  const p1 = path.join(root,'.publish.yaml');
  if (fs.existsSync(p1)) {
    const env = yaml.safeLoad(fs.readFileSync(p1),'utf8')
//    const vs = meta.storage.split(/\r?\n/).map(it=>it.trim()).filter(it => (it.length>0));
//    return Object.assign(meta, {storage:vs}) // make an array.
    return {env,fname:p1};
  }
}


// -------------------------------------------------------------------------


function select_site (format) {
  switch(format) {
    case 'yellow-book': return require('./yellow-book-v2.js');

    default:
      return require('./blueink-np-v2.js');
  }
}


// ------------------------------------------------------------------------



async function read_directory(fpath) {
  if (typeof fpath !== 'string') {
    const err_msg = `@450 read_directory `;
    console.log(err_msg,{fpath})
    throw err_msg;
  }

  if (! fpath.startsWith('s3://')) {
    return fs.readdirSync(fpath, 'utf8')
  }

  const dir = await s3.readdir(fpath) // retuns the full path (Key)
  const dir2 = dir.map(({Prefix})=>{
    const {dir,name} = path.parse(Prefix)
    return name;
  })
  //console.log({dir2})
  return dir2;
}
