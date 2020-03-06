//import find from 'find';
//import walk from 'klaw-sync';
import fs from 'fs';
import path from 'path'
import yaml from 'js-yaml'
//const fs = require('fs')

function walk(dir, level=1, out=[]) {
  const list = fs.readdirSync(dir, {withFileTypes:true});
  // first check if there is /.editora => stop recursion
  list.forEach(fn =>{
//      console.log(`--(${level}) dir:${fn.isDirectory()} sym:${fn.isSymbolicLink()}`,fn.name)
//      console.log(`--(${level}) isFile:${fn.isFile()} `,fn.name)
    const follow = !fn.isFile();
    if (follow) {
      if (level<3) walk(path.join(dir,fn.name), level+1, out)
    } else {
      if (fn.name.endsWith('\.editora')) {
        out.push(path.join(dir,fn.name))
//          console.log(`out(${out.length})`)
      }
    }
  })
  return out;
}


function init(www_root) {
  /*
      looks for all '.editora' files
  */
//  const files = find.fileSync(/\.editora/, www_root)


  const dir = {};
  const out = walk(www_root)
  console.log(`@34: out=>`,out)
  out.forEach(fn => {
    const json = yaml.safeLoad(fs.readFileSync(fn,'utf8'))
    let vpath = json.path;
    if (!vpath) {
      const {dir} = path.parse(fn);
      vpath = dir.substring(dir.lasIndexOf('/'));
    }
    if (dir[vpath]) {
      console.log(`@42: ALERT duplicate entry -ignored-`)
      console.log(`@42: dir[${vpath}]=${fn}`,dir[vpath])
    } else {
      dir[vpath] = fn;
      console.log(`dir[${vpath}]=${fn}`,dir[vpath])
    }
  })


    console.log(`dir:`,{dir})
  return {error:'todo'}

  const filter = ({path,stats})=>{
    const b = path.endsWith('/.editora');
    console.log(`@14: match:${b} path:`,path)

    return false;
  };

  const filter2 = item =>{
    const {path, stats} = item;
    const b = path.endsWith('/.editora');
    console.log(`@14: match:${b} path:`,path)

    return true;
  };

  const files = walk(www_root, {
    nodir: true,
    depthLimit: 2,
    filter: filter2,
  })
  console.log(`@13 files:`,files)
  return {error:'todo'}
}


module.exports = {
  init,     // init('/www')
  walk,
}
