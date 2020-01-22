const fs = require('fs-extra');
const path = require('path')
const cheerio = require('cheerio')
const yaml = require('js-yaml')
const assert = require('assert')

/*
      cmd:
      - path to web page (html)
      - e3 id.

      (1) - locate MD file (path # id.md)
      (2) - if not found, locate element in web page, extract and create MD.
*/



module.exports.get_e3md = function(cmd){
  const {url,ai} = cmd
  console.log('Entering get-e3data')
  return new Promise((resolve, reject)=>{
    if (!url) {
      throw new Meteor.Error(500, `missing url parameter.`);
    }
    const fpath = path.join('/www/editora-registry',url);
    console.log({fpath})
    if (!fs.existsSync(fpath)) {
      console.log({fpath})
      throw new Meteor.Error(500, 'url-not-found in registry');
//        reject('hello error')
//        reject(Object.assign(cmd, {err:'file-not-found in regsitry'}))
      return;
    }
    if (!fs.existsSync(path.join('/www/editora-registry',url))) {
      console.log({fpath})
      throw new Meteor.Error(500, `file-not-found <${url}>`);
//        reject('hello error')
//        reject(Object.assign(cmd, {err:'file-not-found in regsitry'}))
      return;
    }

    const md_fn = path.join('/www/editora-registry',url)+`#${ai}.md`;

    if (!fs.existsSync(md_fn)) {
      console.log(`extract and rebuild MD file:`,{md_fn})
      const {html,tagName} = extract_html(cmd)
      const data = `---
format: raw-html
---
${html}\n`;


      if (true) {
        fs.writeFileSync(md_fn,data,'utf8');
      }
      resolve(Object.assign(cmd, {data, tagName}));
      return;
    }

    /*
        Here the MD file exists.
        - read .md
        - split and decode YAML
    */

    const data = fs.readFileSync(md_fn,'utf8');
    /*
    const v = _md.trim().split(/\-\-\-/g); //match(yamlBlockPattern);
    assert(!v[0])
    assert(v.length == 3)

    //console.log(v[1]);
    var json = yaml.safeLoad(v[1], 'utf8');
    //console.log(v[2]);
    */

    resolve(Object.assign(cmd,{data}));


    setTimeout(()=>{
      resolve(cmd)
    }, 3000)
  })
}


function extract_html(cmd) {
  const {url,ai} = cmd
  const html = fs.readFileSync(path.join('/www/editora-registry',url),'utf8');
  const $ = cheerio.load(html);
//  const a = $('body').find(`#${ai}`)
  const a = $(`#${ai}`);
  console.log(`found id:${ai} ${a.length}`)
  const tagName = a[0].name; console.log({tagName})
  return {tagName, html: ($(a[0]).html() || '').replace(/^[\s]*/gm,'')};
}


module.exports.save_e3md = (cmd)=>{
  const {url,ai,data,update} = cmd;
  assert(url);
  assert(ai);
  assert(data)
  const fpath = path.join('/www/editora-registry',url)+`#${ai}.md`;
  fs.writeFileSync(fpath,data,'utf8');
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
    var metadata = yaml.safeLoad(v[1], 'utf8');

    console.log({metadata})

    if (!metadata.format) {
        /*
            basic renderer : metadata are not used in renderer.
        */
      v[2] = require('./md2html.js')(v[2]);
    }
    else if (metadata.format != 'raw-html') {
      console.log('ALERT TODO FOR new format')
      v[2] = v[2]; //.......................
    }


    console.log(`save-e3md update requested <${url}>#${ai}`)
    const web_fn = path.join('/www/editora-registry',url);
    const html = fs.readFileSync(web_fn,'utf8');
    const $ = cheerio.load(html);
  //  const a = $('body').find(`#${ai}`)
    const av = $(`#${ai}`);
    console.log(`found id:${ai} ${av.length}`)
    av.empty().append(v[2]);
    fs.writeFileSync(web_fn, $.html(), 'utf8');
    console.log(`fs.writeFileSync done w/fpath:`,web_fn)
  }
}


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
