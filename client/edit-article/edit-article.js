const fs = require('fs')
const path = require('path')
const assert = require('assert');
const yaml = require('js-yaml')

import {parse_s3filename, extract_metadata} from '/shared/utils.js'
import './edit-article.html'
import './edit-panel.js'
// import './preview-panel.js'
import './right-panel-header.js'
//import './right-panel-preview.js'
import './right-panel-info.js'
import './right-panel-directory.js'
import './right-panel-deep-search.js'
import '/client/find/find-panel.js'


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


TP.onCreated(function(){
  const tp = this;
  console.log(`> edit-article.onCreated`)

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
  //  Session.set('showing-right-panel',true);
    Session.set('panel','showing-dir3-panel');
  } else {
//    Session.set('showing-right-panel',false);
  }
})


TP.onRendered(function() {
  const tp = this;
  const etime_ = new Date().getTime();
  console.log(`> edit-article.onRendered`)

  this.autorun(() =>{
    let panel = Session.get('panel');
    if (!panel) {
      // panel might not be ready here. It's Ok.
      //console.error('sys-error Session::panel undefined')
      return;
    }
    panel = panel.replace('showing-','')
    console.log({panel})
    //const panels = tp.findAll('vbox.a-panel');
    //console.log(`panels:`,panels)
    const panels = document.querySelectorAll('vbox.a-panel')
    panels.forEach(p =>{
      console.log(`panel <${p.id}>`)
      if (p.id == panel) {
        p.classList.remove('hidden')
      } else {
        p.classList.add('hidden')
      }
    })


  })

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

// --------------------------------------------------------------------------

function capture_options(url) {
  url = url.trim();
  const rx = /^(.*?)\s+\-\-(.*)$/;
  const v = rx.exec(url);
  const flags = v && (v.length>1) && v[2];
  const s3 = (v && v[1]) || url;
  return {s3, flags};
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

    const s3fn = s3 || workpace || w3;
    if (s3fn) {
      Session.set('original-request', s3fn);
    }


    let s3_url, flags;

    if (s3) {
      // WE EXPECT A MD-file.
      // ex: /edit?s3=abatros/projects/227-editora-v2.md
      // this /edit?s3=abatros/projects/227-editora-v2[/]
      //    => will redirect to dir3-panel

      // DO NOT SHOW RIGHT PANEL
      // in the edit-panel, if <s3-url>.index.md does not exists => we will open the directory.

      let {s3:s3fn, flags:flags_} = capture_options(s3); // --force
      ;(verbose >0) && console.log(`@553 `,{flags},{s3fn})

      const {Bucket,Key,subsite,xid,base,ext} = parse_s3filename(s3fn)
      if (!ext) {
        // we infer it's a directory.
        //s3fn = path.join(Bucket,Key)+'/';
        /****************************************************

        we dont need '/' because we know it's a dir3

        *****************************************************/
        s3fn = path.join(Bucket,Key);
        ;(verbose >=0) && console.log(`@56 subsite:=<${s3fn}>`)
        ;(_editora_debug_session) && console.log(`${'@'.repeat(30)} SET session.workspace := <${s3fn}>`)
        Session.set('workspace', s3fn);

        BlazeLayout.render('edit_article', {flags});
        return;
      }

      s3_url = path.join(Bucket, Key)
      flags = flags_;
      ;(_editora_debug_session) && console.log(`${'@'.repeat(30)} SET session.s3-url := <${s3_url}>`)
      Session.set('s3-url', s3_url) // this is the requested object-file
//      Session.set('showing-right-panel',false);
      BlazeLayout.render('edit_article', {flags, s3_url, flags});
      } // s3

    else if (workspace || w3) {
      const ws = workspace || w3;
      ;(verbose >=0) && console.log(`@245 workspace:=<s3://${ws}>`)
        _editora_debug_session.set('workspace', 's3://'+ws)
      Session.set('workspace', 's3://'+ws)
      _editora_debug_session.set('s3-url', null)
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
