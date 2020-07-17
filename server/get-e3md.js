const fs = require('fs-extra');
const path = require('path')
const cheerio = require('cheerio')
const yaml = require('js-yaml')
const assert = require('assert')
import FindFiles from 'file-regex';
import {walk} from './lib/walk-editora.js'
const massive = require('massive');
const monitor = require('pg-monitor');

/*
      cmd:
      - path to web page (html)
      - e3 id.

      (1) - locate MD file (path # id.md)
      (2) - if not found, locate element in web page, extract and create MD.
*/

function find_html_path(o) {
  /*******
  lookup strategy for
      pathname: '/en/home'
      xid: 'upcoming'

  (1) en/home.html
  (2) en/home/index.html
  ***********/

  const {host, pathname, xid, verbose=true} = o;
  const host_fn = path.join('/www/editora-registry',host);
  if (!fs.existsSync(host_fn)) throw `registry not found`;

  // try: /www/editora-registry/en/home
  let html_path = path.join(host_fn,pathname);
  ;(verbose >0) && console.log(`@31: html_path trying <${html_path}>`)
  if (fs.existsSync(html_path)) {
    if (html_path.endsWith('.html')) return {html_path}; // case (1)

    // here it should be a directory => html must be index.hml
    html_path = path.join(host_fn,pathname,'index.html');
    ;(verbose >0) && console.log(`@37: html_path trying <${html_path}>`)
    if (fs.existsSync(html_path)) {
      return {html_path}
    } else {
      return {html_path, error:`@41`}
    }
  }

  // here pathname is not a folder in case (1)

  html_path += '.html'
  ;(verbose >0) && console.log(`@31: html_path trying <${html_path}>`)
  if (fs.existsSync(html_path)) {
    return {html_path}
  } else {
    return {html_path, error:'@49'}
  }
} // find html_path


async function find_md_path(o) {
  /*******
  lookup strategy:

  pathname : en/home
  xid: 'upcoming'
  lookup for a file ending with upcoming.md

  (1) en/home.html    => en/home.html#upcoming.md
  (2) en/home         => en/home/upcoming.md
  (3) en/new-products => en/new-products/upcoming/index.md

  ***********/

  const {host, pathname, xid, verbose=true} = o;
  const host_fn = path.join('/www/editora-registry',host);
  if (!fs.existsSync(host_fn)) throw `registry not found`;

  //
  let md_path = path.join(host_fn,pathname);
  ;(verbose >0) && console.log(`@31: md_path trying <${md_path}>`)
  if (fs.existsSync(md_path+'.html')) {
    /*********************************
    /en/home.html => /en/home.html#upcoming.md
    **********************************/
    md_path += `#${xid}.md`
    ;(verbose >0) && console.log(`@82: md_path trying <${md_path}>`)
    if (fs.existsSync(md_path)) {
      return {md_path};
    } else {
      return {md_path, error:'file-not-found'}
    }
  }

  /*
    here, expecting case (2) and (3)
  */

  if (!fs.existsSync(md_path)) {
    ;(verbose >0) && console.log(`@95: md_path trying <${md_path}>`)
    throw `@92: file-not-found <${md_path}>`;
    return {md_path, error:'file-not-found'}
  }

  md_path = path.join(md_path,xid);
  ;(verbose >0) && console.log(`@101: md_path trying <${md_path}>`)

  /*************************************
  cases:
  /en/new-products/index.html
  /en/new-products/1466
  /en/new-products/1466.md
  /en/home/upcoming.md

  (md_path,xid) exists =>
  /en/new-products/1466
  /en/home/upcoming


  **************************************/

  if (!fs.existsSync(md_path)) {
    /************************
    It must be:
    /en/home/upcoming => try "/en/home/upcoming.md"
    /en/new-products/1466 => try 1466^xxxxxx
    *************************/
    ;(verbose >0) && console.log(`@106: md_path trying <${md_path+'.md'}>`)
    if (fs.existsSync(md_path +'.md')) {
      md_path += '.md'
      return {md_path}
    } /*else {
      // try to locate index.md  under /en/new-products/1466*
    }
    else {
      return {md_path, error:'file-not-found'}
    }*/
  }

  /************************
  here,
  /en/new-products/1466 - exists
  /en/home/upcoming - exists
  *************************/

  md_path = path.join(md_path,'index.md'); // case (3)
  ;(verbose >0) && console.log(`@114: md_path trying <${md_path}>`)
  if (fs.existsSync(md_path)) {
      return {md_path}
  } /*else {
      return {md_path, error:'file-not-found'}
  }*/

  /******************************
  last chance, try to locate index.md under /en/new-products/1466^xxxxxxx
  *******************************/

  const regex = new RegExp(`\\/${xid}\\^.+\\.md`,'g');
//        const v = await FindFiles(path.join('/www/editora-registry',host,pathname), /\/1464\^.+\.md/g, 5)
  const v = await FindFiles(path.join(host_fn,pathname), regex, 5)
//        console.log(`@78: v:`,v)
  v.forEach(x=>{
    console.log(`@81: `,x)
  })


  if (v.length <=0) {
    // return a proposed file-not-found
    throw 'return a proposed file-not-found'
  }

  if (v.length ==1) {
    console.log(`@74: found folder for xid:${xid} v.length:${v.length}`)
    const {dir,file} = v[0]
    md_path = path.join(dir, file)
    return {md_path}
  }

} // find md-file


const e3_registry = {};

module.exports.init = function(www_root) {
  files = walk(www_root)
  console.log(`@186: files=>`,files)
  files.forEach(fn => {
    const json = yaml.safeLoad(fs.readFileSync(fn,'utf8'))
    let vpath = json.path;
    if (!vpath) {
      console.log(`@191: fn <${fn}>`)
      const {dir} = path.parse(fn);
      vpath = dir.substring(dir.lastIndexOf('/')+1);
    }
    if (e3_registry[vpath]) {
      console.log(`@42: ALERT duplicate entry -ignored-`)
      console.log(`@42: dir[${vpath}]=${fn}`,e3_registry[vpath])
    } else {
      e3_registry[vpath] = json;
      console.log(`dir[${vpath}]=${fn}`,e3_registry[vpath])
    }
  })

  console.log(`@203: e3_registry=>`,e3_registry)

  Object.keys(e3_registry).forEach(async (hostName) =>{
    const host = e3_registry[hostName];
    if (host.pg) {
      console.log(`@209: opening connection with Postgres... pg=>`,host.pg)
      host.db = await massive(host.pg);
      if (host.pg.pg_monitor) {
        monitor.attach(host.db.driverConfig);
        console.log(`pg-monitor attached-Ok.`);
      }

      console.log(`@217: Postgres connection open.`)
    }
  })


}

module.exports.get_e3md = function(cmd){
  const {host, pathname, xid} = cmd
  console.log('@226: Entering get-e3data cmd:',{cmd})

  /****************

  FIRST:
    check editora-e3_registry for /www/editora-registry/<host>

  *****************/
  console.log(`@234: e3_registry[${host}]:`,!!e3_registry[host])
  if (e3_registry[host].pg) {
    const env = e3_registry[host];
    const db = e3_registry[host].db
    assert(db)
    return db.query (`
      select *
      from tvec.pagex
      where (path <@ $2)
      and (xid = $1)
    ;`, [xid, pathname], {single:true})
    .then(retv =>{
//      console.log(`get-itemx =>${retv.length} rows in ${new Date().getTime()-etime} ms.`)
      console.log(`@244: get-itemx => `,retv)
      if (!retv) {
        return Object.assign(cmd,{error:'article-not-found'});
      }

      return Object.assign(cmd,{data: yaml.safeDump(retv)});
//      return {data:retv}
    })
    .catch(err=>{
      console.log(`get-item err:`,err)
      return {
        error:err.message
      }
    })

    throw 'TODO@235 we have an open-connection'
  }




  if (!fs.existsSync(path.join('/www/editora-registry',host))) {
    console.log(`@193: file-not-found <${path.join('/www/editora-registry',host)}>`)
    return Object.assign({
      error: 'host-not-found-in-registry'
    })
  }

  if (fs.existsSync(path.join('/www/editora-registry',host,'.editora'))) {
    // access the db instead of file-system.
    throw 'TODO access database'
  }



  const {html_path, error:error1} = find_html_path(cmd);
  console.log(`@59: ${error1} html_path:`,html_path)
  if (error1) throw 'fatal'



  const {html,tagName} = extract_html(html_path, xid)


  return new Promise(async (resolve, reject)=>{
    if (!host || !pathname || !xid) {
      console.log(`@23 missing-url.`)
//      throw new Meteor.Error(500, `missing url parameter.`);
      reject('@23 missing-url:',{cmd})
    }


    const {md_path,error:md_not_found=null} = await find_md_path(cmd);
    console.log(`@66: error:${md_not_found}  md_path:`,md_path)
  //  if (error2) throw 'fatal'


    if (md_not_found) {
      fs.writeFileSync(md_path,
      `---\nxid: ${xid}\nformat: raw-html\n---\n`
      + html.replace(/^\s*/gm,' '),'utf8');
      // privileges
  //    const {uid,gid} = fs.stat(path.join('/www/editora-registry',host));
      const parent_folder = path.join(md_path,'..');
      if (!fs.existsSync(parent_folder)) throw `file-not found <${parent_folder}>`;
      const {uid,gid} = fs.statSync(parent_folder);
      console.log(`@174: uid:${uid} gid:${gid} <${parent_folder}> `,fs.statSync(parent_folder))
      await fs.chmod(md_path, 0o775);
      fs.chownSync(md_path,uid,gid)
    }


    const data2 = fs.readFileSync(md_path,'utf8');
    resolve(Object.assign(cmd,{data:data2,md_path}));
return;
//============================================================
    const host_fn = path.join('/www/editora-registry',host);

    /*
          HERE WE LOOK FOR A MD-file associated with XID.
          basic std ex:  /www/editora-registry/localhost/en/upcoming.md
          pathname: 'en'
          xid: 'upcoming'
          to be re-injected into
              /www/editora-registry/localhost/en/home.html

          lookup strategy:
          (1) en/home.html#upcoming.md
          (2) en/home/upcoming.md
          (3) en/home/upcoming/index.md
    */

    let md_fn = path.join('/www/editora-registry',host,pathname,`${xid}.md`);

    console.log(`@28: (31) connecting to registry: `,{host_fn})

    // CHECK A FEW THINGS: throw exceptions

    if (!fs.existsSync(host_fn)) {
      console.log(`@33: /www:`,fs.existsSync('/www'))
      console.log(`@34: /www/editora-registry:`,fs.existsSync('/www/editora-registry'))
      console.log(`@34.2: /www/editora-registry/test.txt:`,fs.existsSync('/www/editora-registry/test.txt'))
      console.log(`@34.3: /www/editora-registry/test:`,fs.existsSync('/www/editora-registry/test'))
      console.log(`@34.3: /www/editora-registry/2020:`,fs.existsSync('/www/editora-registry/2020'))
      console.log(`@34.4: /www/editora-registry/localhost:`,fs.existsSync('/www/editora-registry/localhost'))
      console.log(`@35: ${host_fn}:`,fs.existsSync(host_fn));
      console.log(`@36: fs.realpath${host_fn}:`,fs.existsSync(fs.realpath(host_fn)));

      throw new Meteor.Error(500, 'url-not-found in registry');
//        reject('hello error')
//        reject(Object.assign(cmd, {err:'file-not-found in regsitry'}))
      return;
    }
    if (!fs.existsSync(path.join(host_fn,pathname))) {

      /***
      console.log(`@33: /www:`,fs.existsSync('/www'))
      console.log(`@34: /www/editora-registry:`,fs.existsSync('/www/editora-registry'))
      console.log(`@34.2: /www/editora-registry/test.txt:`,fs.existsSync('/www/editora-registry/test.txt'))
      console.log(`@34.3: /www/editora-registry/test:`,fs.existsSync('/www/editora-registry/test'))
      console.log(`@34.3: /www/editora-registry/2020:`,fs.existsSync('/www/editora-registry/2020'))
      console.log(`@34.4: /www/editora-registry/localhost:`,fs.existsSync('/www/editora-registry/localhost'))
      console.log(`@35: ${host_fn}:`,fs.existsSync(host_fn));
      console.log(`@36: fs.realpath${host_fn}:`,fs.existsSync(fs.realpath(host_fn)));


      */

      fn = path.join(host_fn,pathname);

      console.log(`@43: file-not-found <${fn}>`)
      //fn = path.join(host_fn,pathname)
      if (!fs.existsSync(fn+'.html')) {
        console.log(`@79: file-not-found alternative-(1) <${fn+'.html'}>`)
        throw new Meteor.Error(500, `@80: file-not-found <${fn}>`);
      } else {
        // HERE fn.html exists
        if (!fs.existsSync(fn+'.md')) {
          console.log(`@83 WE NEED TO CREATE THE MD from data <${fn+'.md'}>`)
          const {html,tagName} = extract_html(fn+'.html', xid)
          console.log(`@85 html:`,html);
          // CREATE INITIAL MD-file type:raw-html
          fs.writeFileSync(fn+'.md',
          `---\nxid: ${xid}\nformat: raw-html\n---\n`
          + html.replace(/^\s*/gm,' '),'utf8');
//          throw new Meteor.Error(500, `@84: file-not-found <${fn+'.md'}>`);
console.log(`@83 WE NEED TO CREATE THE MD from data.... DONE.`)
        } else {
        }
        md_fn = fn+'.md' // both cases.
      }


//        reject('hello error')
//        reject(Object.assign(cmd, {err:'file-not-found in regsitry'}))
    //  return;
    }

    /********************************

        HERE: we need to know the 'VERSION'

    *********************************/

// FOR LEGACY    const md_fn = path.join('/www/editora-registry',pathname)+`#${xid}.md`;

//    md_fn = md_fn || path.join('/www/editora-registry',host,pathname,xid,'index.md');

    if (md_not_found) {
      // create -- later
    }

    if (false && !fs.existsSync(md_fn)) {
      /*******************
        DOES THE FOLDER EXISTS ?
      ********************/

      if(!fs.existsSync(path.join('/www/editora-registry',host))) {
        console.log(`@61 file-not-found: <${path.join('/www/editora-registry',host)}>`)
        return;
      }

      if (!fs.existsSync(path.join('/www/editora-registry',host,pathname))) {
        console.log(`@61 file-not-found: <${path.join('/www/editora-registry',host,pathname)}>`)
        return;
      }

      if (!fs.existsSync(path.join('/www/editora-registry',host,pathname,xid))) {
        console.log(`@61 file-not-found: <${path.join('/www/editora-registry',host,pathname,xid)}>`)
        // HERE we might have a folder starting with xid^
//        const dir = await lookup_folder(path.join('/www/editora-registry',host,pathname),xid)

//        const regex = new RegExp('\\/[0-9].+\.md$');
        const regex = new RegExp(`\\/${xid}\\^.+\\.md`,'g');
//        const v = await FindFiles(path.join('/www/editora-registry',host,pathname), /\/1464\^.+\.md/g, 5)
        const v = await FindFiles(path.join('/www/editora-registry',host,pathname), regex, 5)
//        console.log(`@78: v:`,v)
        v.forEach(x=>{
          console.log(`@81: `,x)
        })
        assert(v.length <=1)
        if (v.length ==1) {
          console.log(`@74: found folder for xid:${xid} v.length:${v.length}`)
          const {dir,file} = v[0]
          md_fn = path.join(dir, file)
        } else {
          return;
        }
      }
    }

    console.log(`@94: md_fn:<${md_fn}>`)


    if (!fs.existsSync(md_fn)) {

      console.log(`extract and rebuild MD file:`,{md_fn})
      const {html,tagName} = extract_html(md_fn)
      console.log({html})
      console.log({tagName})

throw 'in-construction at:101'

return;
      const data = `---
format: raw-html
---
${html}\n`;


      if (true) {
        fs.writeFileSync(md_fn,data,'utf8');
        const {uid,gid} = fs.stat(path.join('/www/editora-registry',host));
        console.log(`@174: uid:${uid} gid:${gid}`)
        fs.chownSync(md_fn,uid,gid)
      }
      resolve(Object.assign(cmd, {data, tagName}));
      return;
    }

    /*
        Here the MD file exists.
        - read .md
        - split and decode YAML
    */

    console.log(`@123: md_fn:<${md_fn}>`)
    const data = fs.readFileSync(md_fn,'utf8');

    /*
    const v = _md.trim().split(/\-\-\-/g); //match(yamlBlockPattern);
    assert(!v[0])
    assert(v.length == 3)

    //console.log(v[1]);
    var json = yaml.safeLoad(v[1], 'utf8');
    //console.log(v[2]);
    */

    resolve(Object.assign(cmd,{data,md_fn}));


    setTimeout(()=>{
      resolve(cmd)
    }, 3000)
  })
}


/**********************************************

  extract an article from html file.

  extract_html(fn, xid, section) => html-code

  looking for <article id="<xid>" ....>

***********************************************/

function extract_html(fn, xid) {
  assert(xid)
  const html = fs.readFileSync(fn, 'utf8');
  const $ = cheerio.load(html);
//  const a = $('body').find(`#${ai}`)
  const selector = `body #${xid}`;
  const v = $(selector); // only 1 article should have that ID...
  console.log(`@226: extract_html for xid:${xid} ${v.length}`)
  if (v && v.length > 1) {
    console.log('@437:',v)
    throw `xid:${xid} multiple (${v.length}) hits in <${fn}>`
  }
  if (!v || v.length != 1) {
    throw `xid:${xid} not found in <${fn}>`
  }
  const tagName = v[0].name; console.log({tagName})
  return {tagName, html: ($(v[0]).html() || '').replace(/^[\s]*/gm,'')};
}


module.exports.save_e3md = (cmd)=>{
  console.log(`\n\n@373: save_e3md cmd:`,cmd)
  const {host,pathname,xid,md_path,update} = cmd;
  let {data} = cmd;
  assert(host);
  assert(pathname);
  assert(xid);

//  if (typeof data !== 'object') data = {};

  /********************************************

  FIRST: check the registry

  *********************************************/

  if (e3_registry[host]) {
    const db = e3_registry[host].db;
    if (db) { // open connection

      // reformat(data) meta+markup


      // save into DB.
      db.tvec.write_pagex(
        pathname,         // path
        xid,              // xid
        'unknown',        // filename
        0,                // pageno
        data,             // data::jsonb
        null //'\n'            // raw text for tsv
      )
      .then(retv =>{
        console.log(`@571: save_e3md(pg) retv=>`,retv)
        return Object.assign(cmd, {status:'success'});
      })
      .catch(error=>{
        console.log(`ALERT write_page FAILED xid:${article.xid}`)
        return Object.assign(cmd, {error})
      });
    } else {
      return Object.assign(cmd, {error:'db-not-connected'})
    }

    // throw 'we-should-not-be-here'
    return;
  }


  assert(data)
  assert(md_path)
  assert(md_path.endsWith('.md'));

  const {html_path, error} = find_html_path(cmd);
  assert(html_path.endsWith('.html'));

  /******************
  const fpath = path.join('/www/editora-registry',host,pathname)+`#${ai}.md`;
  *******************/

//  const fpath = path.join('/www/editora-registry',host,pathname,xid,'index.md');

  console.log(`@177: writing file <${md_path}>`)
//throw 'working-177';

  // data is file content (text)
  fs.writeFileSync(md_path,data,'utf8');

  /**********************************************
    WE NEED TO REMEMBER WHERE TO WRITE THE RESULTS....
    either:
      (1) page-123.md => page-123.html
      (2) page-123/index.md => page-123/index.html

      EASY: replace md by html
  ***********************************************/

//  const web_fn = path.join('/www/editora-registry',host,pathname,'index.html');
//  const web_fn = md_fn.replace(/\.md$/,'.html');
  console.log(`@250: for html at <${html_path}>`)


  if (cmd.update) {
    /*
        update web-page
        - could be partial (default)
        - or full-rebuild. (todo)
    */

    const v = data.split(/\-\-\-/g);
    assert(!v[0])
    assert(v.length == 3)

    //console.log(v[1]);
    let meta = yaml.safeLoad(v[1], 'utf8');
    let article_html =`<div style="color:red">ALERT MISSING ARTICLE xid:${xid}</div>`
    //console.log({metadata})

    if (!meta.format) {
        /*
            basic renderer : metadata are not used in renderer.
        */
      article_html = require('./md2html.js')(v[2]);
    }
    else if (meta.format == 'diva-v1') {
      // THAT IS FOR NEW-PRODUCTS
      let xdir = xid;
      if (md_path.indexOf('^') >=0) {
        const {dir} = path.parse(md_path.split('^')[1]); // horrible trick.
        xdir += '^' + dir
      }

      console.log(`>>>>>>>>>>  DIVA-1 FORMAT`)

      const inner_row = require('./md2html-simple.js')(data).html;
      // console.log(`@237: HTML-CODE v[2]:`,v[2])
      article_html = `
      <article id="${xid}" class="card new-card js-e3article">
      <img src="./${xdir}/${meta.img}" class="card-imgs mb-2">
      <small class="text-grey mb-2"><b>${meta.sku}</b> </small>
      ${inner_row}
      <div class="btns">
      <a href="./${xdir}/${meta.pdf}" target="_blank" class="btn-red">Download PDF</a>
      <span class="number-btn">${xid}</span>
      </div>
      </article>
      `;
    }
    else if (meta.format != 'raw-html') {
      console.log('ALERT TODO FOR new format')
      console.log({meta})
      /***********************
        LOOK FOR A TEMPLATE
        and transform md into html
      ************************/

      throw 'ALERT TODO FOR new format'


//      v[2] = v[2]; //.......................

    } else {
      // raw-html
      article_html = v[2];
    }


//    console.log(`save-e3md update requested <${url}>#${ai}`)
//     html_path = html_path || path.join('/www/editora-registry',host,pathname,'index.html');
    console.log(`@221: reading html <${html_path}>`)
    const html = fs.readFileSync(html_path,'utf8');
    const $ = cheerio.load(html);
  //  const a = $('body').find(`#${ai}`)
    const av = $(`body #${xid}`);
    console.log(`found id:${xid} ${av.length}`)

    const jpci = true;
    let elem = $(av[0]);
    console.log(`@550:  --to fix new-products - pathname:${pathname}`)

    if(pathname == '/en/new-products/') {
      console.log(`@577: elem (before):`,elem)
      // move up 1 div.... ONLY FOR new-products..... BUG.
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      // BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD BAD
      elem = $(av[0].parent);
      console.log(`@578: elem (after):`,elem)
    }

    elem.empty().append(article_html);


//    console.log(`\n@256: HTML-CODE for article:\n${article_html}\n-------------`);


    // because empty inner-class

    console.log(`@230: writing html... <${html_path}>`)
    fs.writeFileSync(html_path, $.html(), 'utf8');
//    console.log(`fs.writeFileSync done w/fpath:`,html_path)
  }
} // if (update-requested)


module.exports.e3list = (cmd)=>{
  const {url} = cmd;
  const web_fn = path.join('/www/editora-registry',url);
  return new Promise((resolve,reject)=>{
    const html = fs.readFileSync(web_fn,'utf8');
    const $ = cheerio.load(html);
  //  const a = $('body').find(`#${ai}`)
    const av = $(`.js-e3editora`);
    console.log({av})
    console.log(`found js-e3editora ${av.length}`)
    const retv = av.map((i,e)=>{return $(e).attr('id')||""}).get();
    console.log({retv})
    resolve(retv);
    console.log(`found js-e3editora ${retv.length}`)
  });
}


async function lookup_folder(fn,xid) {
  // open fn and look for all md-files

}
