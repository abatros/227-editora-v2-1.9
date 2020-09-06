const fs = require('fs')
const path = require('path')
const assert = require('assert')
const yaml = require('js-yaml');
const shortid = require('shortid');
const {parse_s3filename} =  require('/shared/utils.js')

const hb = require("handlebars");
const marked = require('marked');
const renderer = new marked.Renderer();
const s3 = require('./aws-s3.js')(); // already initialized.


/***
// consult .config.yaml
const template = await get_template('s3://blueink/ya13/blueink-page-template-v4.html');
;(verbose >1) && console.log({template})
const compiled_template = hb.compile(template);


const {Bucket, Key} = parse_s3filename(s3Name)
return o1.Body.toString('utf8')
**/

const template_fn = 's3://blueink/ya14/blueink-page-template-v4.html';
let compiled_template;

//const compiled_template =
(async ()=>{
  const {Bucket, Key} = parse_s3filename(template_fn)
  const o1 = await s3.getObject({Bucket, Key});
  const template = o1.Body.toString('utf8')
  compiled_template = hb.compile(template);
})();



module.exports = mk_html;

const verbose =0;

async function mk_html(p1) {
  if (typeof p1 === 'string') {
    throw "Invalid parameter for mk_html"
  }
  console.log({p1})
  const {meta, md, s3fpath,
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

  const html = compiled_template(Object.assign(meta, {
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



async function get_thai_for(fname) {
  const vebose =0;
//  const x = path.parse(fname)
  const {Bucket,Key} = parse_s3filename(fname)
  ;(verbose >1) && console.log(`@370 get_thai_for(${fname})`,{Key},{Bucket})
//  const {dir,base} = path.parse(Key)
//  ;(verbose >1) && console.log({dir})

//  const th_Key = dir + '.th.md';
  const o1 = await s3.getObject({Bucket, Key})
  .catch(err =>{
    console.log(`@79 get-thai `, {err})
    return;
  })

  if (!o1) {
    console.log(`Unable to get Thai version for <${Key}>`)
    return {};
  }

  o1.md = o1.Body.toString('utf8');
  ;(verbose >1) && console.log(`thai:`,o1.md)
  return o1
}


function safeLoad_md(data) {
  const v = data.split('\-\-\-')
  assert(v.length == 3, `@38 v.length:${v.length}`)
  assert(v[0].trim().length ==0, '@39')
  const meta = yaml.safeLoad(fix_metadata(v[1]))
  const md = v[2]
  return {meta, md}
}


function fix_metadata(s) {
  const v = s.split('\n');
  v.forEach((li,j) =>{
//    v[j] = li.replace(/^([^:]*):\s*/gm,'$1<<>>').replace(/:/g,'~!~').replace(/<<>>/g,': ')
    v[j] = li.replace(/^([^:]*):\s*/gm,'$1<<>>').replace(/:/g,' ').replace(/<<>>/g,': ')
  })
  return v.join('\n')
}
