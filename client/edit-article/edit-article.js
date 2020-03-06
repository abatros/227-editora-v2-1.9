const fs = require('fs')
const path = require('path')
const assert = require('assert');
const yaml = require('js-yaml')

import './edit-article.html'

const TP = Template.edit_article;

let etime = null;
const state = new ReactiveVar({q:'initial-state'})
const article_meta = new ReactiveVar({});

/*
      An article is associated with a MD file.
      In a web page, the article can be any tag with class="js-e3editora"
*/

TP.onCreated(function(){
  console.log(`@18: Meteor.connection `,Meteor.connection)
  /*
        async : get MD file associated with this article.
        wait onRendered to initialize codeMirror.
  */
  const tp = this;
  etime = new Date().getTime();
  console.log(`[${new Date().getTime()-etime}] Template.edit_article.onCreated.data:`,tp.data)

  //tp.data.save_article = tp.save_article;
  console.log(`done with Template.edit_article.onCreated`)

})

TP.onRendered(function() {
  const conn = Meteor.connection;
  console.log({conn})
  console.log(`@19: Meteor.connection._lastSessionId: `,Meteor.connection._lastSessionId);
  const tp = this;
  console.log(`[${new Date().getTime()-etime}] Template.edit_article.onRendered.data:`,tp.data)
  //const ai = FlowRouter.getParam('ai');
  const xid = tp.data.xid();
  const _host = FlowRouter.getQueryParam('h');
  const host = _host || tp.data.host(); // from connection;
  const pathname = FlowRouter.getQueryParam('p');
  let md_fn;

  article_meta.set({host,pathname,xid})


//  console.log(`data:`,tp.data);
//  console.log(`data.article_id:`,tp.data.ai());
//  console.log(`data.url:`,tp.data.url());



  //tp.cm.setValue(tp.text.get());


  //  tp.text = new ReactiveVar()
  if (!host || !pathname) {
    console.log(`@72 missing-url -stop`)
    console.log(`host:${host}`)
    console.log(`pathname:${pathname}`)
    console.log(`xid:${xid}`)
    return;
  }
    Meteor.call('get-e3data',{host, pathname, xid, x:'hello'},(err,data)=>{
      /*
          Keep it here, to avoid having a Tracker.autorun !
      */
      if (err) {
        console.log('get-e3data fails:',{err})
        console.log({data})
        return;
        throw err; // display error.
      }
      console.log(`@92: [${new Date().getTime()-etime}] Meteor.call => get-e3data:`,{data}) // here is the raw-file content
      const {data:article, error} = data;
      if (error) {
        state.set({error:'article-not-found', text:error})
        console.log(`@101: FATAL error:`, state.get())
        return;
      }

      install_codeMirror(tp);



      /************************************************************************
      What to expect here:

          something for codeMirror: YAMl/metadata [+ MD-code]

      for museum: only metadata.

      When editora read from database, we expect pure text from safeLoad()

      *************************************************************************/



      if (false) {
        data.data = validate_and_enforce_xid(data.data, xid)
        console.log(`@95: `,data.data)
        assert(data.md_path)
      }

      md_fn = data.md_path;

  //    tp.text.set(data.text)
      Session.set('edit-host',host)
      Session.set('edit-pathname',pathname)
      Session.set('edit-xid',xid)
      cm.setValue(data.data);
return;
      cm.setValue(`---
sku: ${ai}
format: raw-html
---
${html}
      `);
    })

    /*
    Meteor.call('get-e3data',{fn:'web_page2',ai:'22222',x:'hello22222'},(err,data)=>{
      if (err) throw err; // display error.
      console.log(`[${new Date().getTime()-etime}] Meteor.call => get-e3data:`,{data}) // here is the raw-file content
    })*/


  cm.on("change", (cm, change)=>{ // transform MD -> Article -> html (preview)
    console.log(`codeMirror change:`,{change});
    /*
    var Article = Meteor.publibase_article;
    const self = this;
//    this.ccount.set(this.ccount.get()+1);
    Session.set('cm-hitCount',1);
    // update a reactive variable.
    let s = cm.getValue();

    // here we should extract data to go in headline, or abstract
    Editora.md_code.set(s);
//    const p = Meteor.publibase_dataset.cc.markup_render_preview(s);
//    Meteor.publibase.article_html_preview.set(p);
  */
    return false; // ??
  });

  function save_article() {
    console.log(`save-e3data cmd:`,{host,pathname,xid,md_fn})
    assert(host);
    assert(pathname);
    assert(xid)
//    assert(md_fn)
    Meteor.call('save-e3data',
      {host, pathname, xid, md_path:md_fn='empty.md', update:true, data:tp.cm.getValue()},
      (err,data)=>{
        if (err) throw err;
        console.log({data}) // here is the raw-file content
//        const tab = window.open('http://localhost:8080/en/new-products/1466','http://localhost:8080/en/new-products/1466')
      })
  }

  // ---------------------------------------------------------------------------

  function install_codeMirror(tp) {
    const cm_TextArea = tp.find('#cm_TextArea'); //document.getElementById('myText');

    console.log({cm_TextArea})
    console.log(`Template.edit_article.onRendered.data:`,tp.data)
    // configure codeMirror for this app-key
    var cm = tp.cm = CodeMirror.fromTextArea(cm_TextArea, {
  //      mode: "javascript",
  //      mode: "markdown",
        mode: "text/x-yaml",
        lineNumbers: true,
        viewportMargin:10,
        cursorScrollMargin: 5,
        lineWrapping: true,
        matchBrackets: true,
  //      keyMap:'vim',
        keyMap:'sublime',
        viewportMargin:200, // ???
        extraKeys: {
          "Ctrl-S": save_article,
  //        "Ctrl-Right": next_article,
  //        "Ctrl-Left": prev_article
        }
    });
    //  cm.save()
    $(".CodeMirror").css('font-size',"10pt");
    $(".CodeMirror").css('line-height',"24px");
    cm.setSize('100%', '100%');
    // json to yaml.

  } // install_codeMirror


}) // on Rendered



TP.helpers({
  q: ()=>{
    return state.get()
  },
  error_code: (code)=>{
    return (state.get().error == code)
  },
  text: ()=>{
    return Template.instance().text.get();
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


FlowRouter.route('/article/:xid', { name: 'edit-article',
  triggerEnter: [
    function(context, redirect) {
      const web_page = Session.get('web-page');
      console.log(`triggerEnter web_page:`,Session.get('web-page'))
      if (!web_page) redirect('/')
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "editora-v2";
//    const web_page = Session.get('web-page');
    /*
    if (!web_page) {
      console.log(`no web-page defined. switching to root.`)
      FlowRouter.go('/')
      return;
    } */
//    Session.set('article-id',params.article_id)
//    console.log(`html-page already set:`,Session.get('web-page'))
    console.log(`render data:`,Object.assign(params,queryParams))
//    BlazeLayout.render('edit_article',Object.assign(params,queryParams));
    const {host} = location;

    BlazeLayout.render('edit_article', {xid:params.xid, host});
  }
});



FlowRouter.route('/edit', { name: 'edit-article',
  triggerEnter: [
    function(context, redirect) {
      const web_page = Session.get('web-page');
      console.log(`triggerEnter web_page:`,Session.get('web-page'))
      if (!web_page) redirect('/')
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "editora-v2";
    console.log(`@210: host:`,location.host)
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
    console.log(`render data:`,Object.assign(params,queryParams))
//    BlazeLayout.render('edit_article',Object.assign(params,queryParams,{xid:queryParams.xid}));

    console.log(`@225: `,{host})
    BlazeLayout.render('edit_article', {xid:queryParams.xid, host});
  }
});


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
