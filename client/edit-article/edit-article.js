const fs = require('fs')
const path = require('path')
const assert = require('assert');

import './edit-article.html'

const TP = Template.edit_article;

let etime = null;

/*
      An article is associated with a MD file.
      In a web page, the article can be any tag with class="js-e3editora"
*/

TP.onCreated(function(){
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
  const tp = this;
  console.log(`[${new Date().getTime()-etime}] Template.edit_article.onRendered.data:`,tp.data)
  const ai = FlowRouter.getParam('ai');
  const url = FlowRouter.getQueryParam('url');

//  console.log(`data:`,tp.data);
//  console.log(`data.article_id:`,tp.data.ai());
//  console.log(`data.url:`,tp.data.url());
  const cm_TextArea = this.find('#cm_TextArea'); //document.getElementById('myText');

  console.log({cm_TextArea})
  console.log(`Template.edit_article.onRendered.data:`,tp.data)
  // configure codeMirror for this app-key
  var cm = this.cm = CodeMirror.fromTextArea(cm_TextArea, {
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

  //tp.cm.setValue(tp.text.get());


  //  tp.text = new ReactiveVar()
    Meteor.call('get-e3data',{url, ai, x:'hello'},(err,data)=>{
      /*
          Keep it here, to avoid having a Tracker.autorun !
      */
      if (err) {
        console.log('get-e3data fails:',{err})
        console.log({data})
        return;
        throw err; // display error.
      }
      console.log(`[${new Date().getTime()-etime}] Meteor.call => get-e3data:`,{data}) // here is the raw-file content
  //    tp.text.set(data.text)
      Session.set('edit-url',url)
      Session.set('edit-ai',ai)
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
    console.log(`save-e3data`)
    assert(url);
    assert(ai)
    Meteor.call('save-e3data',
      {url, ai, update:true, data:cm.getValue()},
      (err,data)=>{
        if (err) throw err;
        console.log({data}) // here is the raw-file content
      })
  }


}) // on Rendered



TP.helpers({
  text: ()=>{
    return Template.instance().text.get();
  }
})

FlowRouter.route('/edit-article/:ai', { name: 'edit-article',
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
    document.title = "editora-v1";
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
    BlazeLayout.render('edit_article',Object.assign(params,queryParams));
  }
});
