import './right-panel-preview.html'
import marked from 'marked'
import assert from 'assert';
import handlebars from 'handlebars';
import shortid from 'shortid';
import utils from '/shared/utils.js';
import path from 'path';
import yaml from 'js-yaml';


const TP = Template.right_panel_preview;

TP.onCreated(function() {
  const tp = this;
  tp.html = new ReactiveVar()
})

TP.onRendered(function() {
  const tp = this;
  const s3_url = Session.get('s3-url');
  const {Bucket, subsite, xid, fn} = utils.extract_subsite(s3_url);

  // do we have md-file in the cache ?

  tp.autorun(async ()=>{
    const verbose =1;
//    const s3_url = Session.get('s3-url');
//    console.log(`@16 >>>autorun s3-url:${s3_url}`)
    const md_file = Session.get('md-file')
    console.log(`@17 >>>autorun md_file.length:${md_file && md_file.length}`)

    const publish_fn = 's3://' + path.join(Bucket,subsite,'.publish.yaml')
    const cfg = await get_publish_yaml(publish_fn);
    console.log(`@33 `,{cfg})

    const default_ = `s3://blueink/ya14/mk-html.js`
    const {template:template_fn, md2html = default_} = cfg;

    const template = await get_template(template_fn); // cache

    console.log(`@40 `,{template})

    const md2html_js = await get_js_code(md2html); // cache
    console.log(`@43 `,{md2html_js});

//    eval(`function ping() {return 'pong'}`)

    console.log(`@44]\n`,md2html_js);
    eval(md2html_js);
    const _custom = custom();

    ;(verbose >0) && console.log(`@123 eval done `, {_custom})

    const {meta, md} =  utils.extract_metadata(md_file)
    ;(verbose >0) &&
    console.log(`@124 md.length:${md.length} tpl.length:${template.length}`,{meta})

    meta.xid = xid; // IMPORTANT meta,xid is too short. does not include sku.
    const retv = _custom.mk_html({meta,md,html:template})
    console.log(`@52 `,{retv})

    tp.html.set(retv.html)
//    md2html(tp,s3_url,md_file)
  })

  const meta = Session.get('meta')
  console.log({meta})
  /*
  if (meta.s3_url != s3_url) {
    throw '@18 CORRUPTED.'
    // reload md-file.
  }*/

  // here : build the html-code
  // ask the server to read md-file and build html
  // or to give us a template to rebuild html here in the client.





  /*
  Meteor.call('get-s3Object-versions',s3_url,(err,data)=>{
    if (err) throw err;
    console.log(`@13 `,{data}) // array

    versions.splice(0,9999)
    versions.push(...data);
    console.log(`@22 `,versions.list())
  }) */
  return;
}) // on Rendered


TP.helpers({
  html: ()=>{
    const tp = Template.instance();
    return tp.html && tp.html.get();
  }
})


// --------------------------------------------------------------------------

const yaml_cache = {
  s3_url: null,
  cfg: null
}

async function get_publish_yaml(s3_url) {

  if ((s3_url == yaml_cache.s3_url)
      &&(yaml_cache.cfg != null))
      return yaml_cache.cfg;

  console.log(`@88 UPDATING CACHE YAML`)
  return new Promise((resolve, reject) =>{
    Meteor.call('get-s3object',s3_url, (err,data) =>{
      if (err) throw err;
      if (!data.ETag) throw 'file-not-found'
      yaml_cache.cfg = yaml.safeLoad(data.data)
      yaml_cache.s3_url = s3_url;
      resolve(yaml_cache.cfg)
    })
  })
} // get-publish-yaml

// --------------------------------------------------------------------------

const js_cache = {
  s3_url: null,
  code: null
}

async function get_js_code(s3_url) {

  if ((s3_url == js_cache.s3_url)
      &&(js_cache.code != null))
      return js_cache.code;

  console.log(`@88 UPDATING CACHE JS`)
  return new Promise((resolve, reject) =>{
    Meteor.call('get-s3object',s3_url, (err,data) =>{
      if (err) throw err;
      if (!data.ETag) throw 'file-not-found'
      js_cache.code = data.data;
      js_cache.s3_url = s3_url;
      resolve(js_cache.code)
    })
  })
} // get-publish-yaml


// --------------------------------------------------------------------------

const template_cache = {
  s3_url:null,
  template:null,
  mk_html:null
}

async function get_template(s3_url) {
  if ((template_cache.s3_url == s3_url)
        &&(template_cache.template !=null)) {
          return template_cache.template;
  }

  return new Promise((resolve,reject) =>{
    Meteor.call('get-template',s3_url, (err, data) =>{
      if (err) reject(err);

      // expect html-template in data.
      console.log({data})
//      const code = data.renderer.js;
//      console.log({code})
      template_cache.template = data.html;
//      template_cache.compiled = data.compiled;
//      template_cache.mk_html = data.renderer.js;
      template_cache.s3_url = s3_url;
      console.log(`@97 compiled:`,template_cache.compiled)
      resolve(template_cache.template);
      return;
      /*
      const retv = eval(code)
      console.log(`@35 `,{retv})
      const html = custom().mk_html('jules')
      tp.html.set(html)
      */
    })
  })
} // get-template



async function md2html(tp, s3_url, md_file) {
  const verbose =1;

  ;(verbose >0) && console.log(`@117 print_html s3_url:${s3_url} md_file.length:${md_file.length}`)
  const template_changed = true;

  const {Bucket, subsite, xid, fn} = utils.extract_subsite(s3_url);
  ;(verbose >0) &&
  console.log(`@122 print_html `,{Bucket},{subsite},{xid},{fn})

  const retv1 = await get_template(s3_url);
  ;(verbose >0) && console.log(`@120 get_template `,{retv1})

  const {template, mk_html, ping} = retv1;

  eval(ping)
  const _custom = custom(); // object set by eval.

  ;(verbose >0) && console.log(`@123 eval done `, {_custom})

  const {meta, md} =  utils.extract_metadata(md_file)
  ;(verbose >0) && console.log(`@128 `,{meta})
  ;(verbose >0) && console.log(`@129 md.length:${md.length}`)
  ;(verbose >0) && console.log(`@130 template.length:${template.length}`)

/*
  const retv2 = _custom.mk_html({
    html:template, // to be compiled by mk_html
    md,
    meta
  }) */


  console.log(`@127 `,{retv2})
  tp.html.set(retv2.html)
}
