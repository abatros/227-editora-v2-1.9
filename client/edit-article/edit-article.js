const fs = require('fs')
const path = require('path')
const assert = require('assert');
const yaml = require('js-yaml')

import {parse_s3filename, extract_metadata} from '/shared/utils.js'
import './edit-article.html'
import './edit-panel.js'
// import './preview-panel.js'
import './right-panel-header.js'
import './right-panel-preview.js'
import './right-panel-info.js'
import './right-panel-directory.js'
import './right-panel-deep-search.js'


import utils from '/shared/utils.js'

const verbose =1;

const TP = Template.edit_article;

let etime = null;
const state = new ReactiveVar({q:'initial-state'})
const article_meta = new ReactiveVar({});

/*
      An article is associated with a MD file.
      In a web page, the article can be any tag with class="js-e3editora"
*/

import {s3parser} from '/shared/utils.js'




function commit_article_Obsolete(tp) {
  console.log(`@22 commit-article s3fpath:`, tp.s3fpath)
  //  console.log(`@206 commit-article meta:`, tp.meta)
  tp.set_status_light('status-busy')

  const xid = extract_xid(tp.s3fpath)

  assert(tp.s3fpath.startsWith('s3://'), `syntax error s3fpath <${s3fpath}>`)

  Meteor.call('commit-s3data', {
    s3fpath:tp.s3fpath, // full path for md-file, ex: s3://bueink/ya14/1102-Y3K2/index.md
    update:true,
    data:tp.cm.getValue()}, (err,data)=>{
      if (err) {
        tp.set_status_light('status-red')
        throw err; // do things on tp, according to results.
      }
      console.log(`@79 `,{data}) // here is the raw-file content
      //        const tab = window.open('http://localhost:8080/en/new-products/1466','http://localhost:8080/en/new-products/1466')


      if (data.error) {
        console.log(`@83 `, data.error)
        tp.set_status_light('status-red')
        Session.set('edit-message',data.err_msg)
        return;
      }



      tp.set_status_light('status-ok')
      Session.set('edit-message','commit Ok.')
    return;
    }

  )
}



TP.onCreated(function(){
  const tp = this;
  etime = new Date().getTime();
  const etime_ = new Date().getTime();
//  console.log(`@18: Meteor.connection `,Meteor.connection)
  //console.log(`@82 edit-article.onCreated cflag:${tp.data.flags()}`)
  /*
        async : get MD file associated with this article.
        wait onRendered to initialize codeMirror.
  */
  // console.log(`@139 [${new Date().getTime()-etime}] Template.edit_article.onCreated.data:\n`,tp.data)

  //tp.data.save_article = tp.save_article;
  //console.log(`@33 done with Template.edit_article.onCreated [${new Date().getTime() - etime1} ms]`)
  Session.set('edit-message','loading...')
  if (Session.get('workspace')) {
    Session.set('showing-right-panel',true);
    Session.set('showing-directory-panel',true);
  } else {
    Session.set('showing-right-panel',false);
  }
})


TP.onRendered(function() {
  const tp = this;
  const etime_ = new Date().getTime();
})

TP.helpers({
  flags: ()=>{
    const tp = Template.instance();
    return tp.data && tp.data.flags()
  }
})


// ---------------------------------------------------------------------------

TP.events({
  /*
  'click .js-directory': (e,tp)=>{
    e.preventDefault(); // to avoid tailing #
//    publish_article(tp); // save, mk-html, mk-ts-vector
    const s3fpath = Session.get('edit-s3fpath')
    assert(s3fpath.endsWith('/index.md'))
    const s3dir = new s3parser(s3fpath).parent().parent().value;
    if (!s3dir) {
      tp.set_status_light ('status-orange')
      Session.set('edit-message',`invalid subsite <${subsite}>`)
      return;
    }
    FlowRouter.go('subsite-directory',{s3dir})
  }*/
})

// ---------------------------------------------------------------------------

TP.helpers({
  q: ()=>{
    return state.get()
  },
  error_code: (code)=>{
    return (state.get().error == code)
  },
  text: ()=>{
    return Template.instance().text.get();
  },
  fileName_or_url() {
    let s3fn = Session.get('edit-s3fpath')
    if (s3fn && s3fn.endsWith('.md')) {
      const {Bucket, subsite, xid} = utils.extract_xid2(s3fn)
      s3fn = `https://${Bucket}.com/${subsite}/${xid}`; // ~~~~~~~ to be fixed.
    }
    return s3fn;
  }
})



Template.edit_article_not_found.helpers({

})

Template.edit_article_not_found.events({
  'click .js-create-article': (e,tp)=>{
    console.log('create...')
    const {host, pathname, xid} = article_meta.get();

    Meteor.call('save-e3data',
      {host, pathname, xid, update:true, data:' ', md_path:'*void*.md'},
      (err,data)=>{
        if (err) throw err;
        console.log(`@224: retv:`,{data}) // here is the raw-file content
//        const tab = window.open('http://localhost:8080/en/new-products/1466','http://localhost:8080/en/new-products/1466')
      })
    return false;
  }
})





function capture_options(url) {
  url = url.trim();
  const rx = /^(.*?)\s+\-\-(.*)$/;
  const v = rx.exec(url);
  const flags = v && (v.length>1) && v[2];
  const s3 = (v && v[1]) || url;
  return {s3, flags};
}


function validate_and_enforce_xid(data, xid) {
  const v = data.trim().split(/\-\-\-/g); //match(yamlBlockPattern);
  assert(!v[0])
  assert(v.length == 3)
//  v[1] = v[1].replace(/^([^:]+):\s*/gm,'$1<<>>').replace(/:/g,'~!~').replace(/<<>>/g,': ')

  //console.log(v[1]);
  let meta = yaml.safeLoad(v[1], 'utf8');
  if (!meta.xid) {
    meta = Object.assign({xid},meta)
//    meta.xid = xid;
    v[1] = yaml.safeDump(meta);
  }
  data = `---` + v[1] + '---' + v[2];
  return data;
}


// ------------------------------------------------------------------------


function get_s3Object(tp) {
  const etime_ = new Date().getTime();
  assert(tp)

  /*
    tp is used to update UI : reactive var mostly error and status.
  */


  Meteor.call('get-s3object', tp.s3fpath, (err, data)=>{
    console.log(`@54 get-e3data got-results [${new Date().getTime() - etime_} ms]`)
    /*
        Keep it here, to avoid having a Tracker.autorun !
    */
    if (err) {
      ;(verbose >0) && console.log(`@81 Meteor.call('get-e3data')`)
      console.log('get-e3data fails:',{err})
      console.log({data})
      Session.set('edit-status','error')
      tp.set_status_light('status-red')
      Session.set('edit-message','failed')
      return;
    }

    console.log(`@112 `,{data})
    if (data.error) {
      console.log(`@206 `, data.error)
      tp.set_status_light('status-red')
      if (flags == 'force') {
        Session.set('edit-message','force creating file please wait...')
        Meteor.call('new-article', tp.s3fpath, (err,data)=>{
          if (err) {
            tp.set_status_light('status-red')
            Session.set('edit-message','new-article system-error1')
            return;
          }
          if (data.error) {
            tp.set_status_light('status-red')
            Session.set('edit-message','new-article system-error2')
            return;
          }


          const {meta, md, error} = utils.extract_metadata(data.data)
          const cmValue = (meta)?`---\n${yaml.dump(meta)}---${md}`:md;
          tp.cm.setValue(cmValue);
          tp.meta = meta;
          document.title = `edit ${tp.s3fpath}`;
          Session.set('edit-s3fpath',`${tp.s3fpath}`)
          tp.set_status_light('status-ok')
          Session.set('edit-message','ready')

        })
        return;
      }
      Session.set('edit-message','file-not-found')
      return;
    }


    const {meta, md, error} = utils.extract_metadata(data.data)

    if (error) {
      console.log(`@117 `,{error})
      Session.set('edit-s3fpath',`${tp.s3fpath}`)
      Session.set('edit-message',error)
      Session.set('edit-status',error)
      tp.set_status_light('status-red')
      return;
    }

    if (!meta || !md) {
      console.log(`@117 `,{error})
      Session.set('edit-s3fpath',`${tp.s3fpath}`)
      Session.set('edit-status', 'no-data')
      return;
    }


    console.log(`@62 `,{meta},{md})
    const cmValue = (meta)?`---\n${yaml.dump(meta)}---${md}`:md;
    assert(tp.cm,'Missing tp.cm')
    tp.cm.setValue(cmValue);
    tp.meta = meta;
    document.title = `edit ${tp.s3fpath}`;
    Session.set('edit-s3fpath',`${tp.s3fpath}`)

    const {subsite, xid} = utils.extract_xid2(tp.s3fpath);
    Session.set('subsite',subsite)
    tp.set_status_light('status-ok')
    Session.set('edit-message','ready')
    document.title = xid;
  })

}

// --------------------------------------------------------------------------


FlowRouter.route('/edit', { name: 'edit-article',
  triggerEnter: [
    function(context, redirect) {
      const web_page = Session.get('web-page');
      console.log(`triggerEnter web_page:`,Session.get('web-page'))
//      if (!web_page) redirect('/')
    }
  ],
  action: function(params, queryParams){
    const verbose =1;
    console.log('Router::action for: ', FlowRouter.getRouteName());
    ;(verbose >0) && console.log(' --- params:',params);
    document.title = "editora-v2";
    ;(verbose >0) && console.log(`@210: host:`,location.host)
    const {host} = location;
//    const web_page = Session.get('web-page');
    /*
    if (!web_page) {
      console.log(`no web-page defined. switching to root.`)
      FlowRouter.go('/')
      return;
    } */
//    Session.set('article-id',params.article_id)
//    console.log(`html-page already set:`,Session.get('web-page'))
    ;(verbose >0) && console.log(`render data:`,Object.assign(params,queryParams))
//    BlazeLayout.render('edit_article',Object.assign(params,queryParams,{xid:queryParams.xid}));

    const {s3, workspace, w3} = queryParams; // full Key for md-file

    let s3_url, flags;

    if (s3) {
      // WE EXPECT A MD-file.
      // ex: /edit?s3=abatros/projects/227-editora-v2.md
      // this /edit?s3=abatros/projects/227-editora-v2[/]
      //    => will redirect to directory-panel

      // DO NOT SHOW RIGHT PANEL
      // in the edit-panel, if <s3-url>.index.md does not exists => we will open the directory.

      let {s3:s3fn, flags:flags_} = capture_options(s3); // --force
      ;(verbose >0) && console.log(`@553 `,{flags},{s3fn})

      const {Bucket,Key,subsite,xid,base,ext} = parse_s3filename(s3fn)
      if (!ext) {
        // we infer it's a directory.
        s3fn = path.join(Bucket,Key)+'/';
        Session.set('workspace', s3fn);
        BlazeLayout.render('edit_article', {flags});
        return;
      }

      s3_url = path.join(Bucket, Key)
      flags = flags_;
      Session.set('s3-url', s3_url) // this is the requested object-file
//      Session.set('showing-right-panel',false);
      BlazeLayout.render('edit_article', {flags, s3_url, flags});
      } // s3

    else if (workspace || w3) {
      const ws = workspace || w3;
      Session.set('workspace', 's3://'+ws)
      Session.set('s3-url', null) // will close left-panel
    } else {
      console.log(`fatal @581`)
      //throw new Error('@581 - expecting queryParams s3 or workspace.')
      FlowRouter.go('welcome')
      return;
    }

    /*
    const password = localStorage.getItem('password');
    if (!password) {
//      BlazeLayout.render('welcome');
      FlowRouter.go('/welcome')
      return;
    } */

    /* because at least one is undefined - we pass queryParams in Session */

    console.log(`@595 leaving router (edit-article) :`,queryParams)
    BlazeLayout.render('edit_article', {flags, s3_url, flags});
  }
});
