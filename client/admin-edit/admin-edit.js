import './admin-edit.html'
import './status-lights.js';


const TP = Template['admin-edit'];

TP.onCreated(function(){
  const tp = this;
  const etime_ = new Date().getTime();
  // console.log(`@18: Meteor.connection `,Meteor.connection)
  console.log(`@9 [${new Date().getTime()-etime_}] Template.edit_article.onCreated.data:`,tp.data)

  //tp.data.save_article = tp.save_article;
  console.log(`@33 done with Template.edit_article.onCreated [${new Date().getTime() - etime_} ms]\n`)
  console.log(`@34 s3:${tp.data.s3()}`)
  Session.set('status-lights','status-busy')

})

function guess_mode(fname) {
  if (fname.endsWith('.md')) return 'text/x-markdown';
//  if (fname.endsWith('.html')) return 'application/x-ejs';
  if (fname.endsWith('.html')) return 'htmlmixed';
  if (fname.endsWith('.js')) return 'javascript';
  if (fname.endsWith('.css')) return 'text/css';
  if (fname.endsWith('.yaml')) return 'text/yaml';
  return 'text/yaml';
}

TP.onRendered(function(){
  const tp = this;
  const etime_ = new Date().getTime();
  const s3 = tp.data.s3();
  const allow_create = (tp.data.create() == undefined) ? false: tp.data.create();

  tp.cm = install_codeMirror(tp);

  const etime2 = new Date().getTime();
  const s3fpath= 's3://'+tp.data.s3();

  Meteor.call('get-s3object', {s3fpath}, (err, retv)=>{
    if (err) {
      Session.set('s3fpath', '<file-not-found>')
      console.log(`@29 `,{err})
      Session.set('status-lights','status-red')
      Session.set('edit-message','file-not-found@45')
      throw err;
    }
    console.log(`@22 `,{retv})
    if (retv.error) {
      console.log(`@34 ${retv.error} allow_create:${allow_create}`)
      Session.set('status-lights','status-red')
      Session.set('edit-message','file-not-found@52')
      throw "TODO: CREATE DUMMY OBJECT, THEN READ AGAIN."
    }

    tp.cm.setOption('mode', guess_mode(s3fpath))
    tp.cm.setValue(retv.data);
    tp.cm.setOption('mode', guess_mode(s3fpath))
    Session.set('edit-s3fpath', s3fpath)
    Session.set('status-lights','status-ok')
    document.title = `admin-edit ${s3fpath}`;
    Session.set('edit-message','ready')

  });

  // ----------------------------------------------------------------------

  tp.commit_article = () =>{
    console.log(`@22 commit-article s3fpath:`, tp.s3fpath)
    //  console.log(`@206 commit-article meta:`, tp.meta)

    Session.set('status-lights','status-busy')
    Meteor.call('put-s3object', {
      s3fpath, // must be full Key for md-file.
      update:true,
      data:tp.cm.getValue()
    }, (err, retv)=>{
        if (err) {
          Session.set('status-lights','status-red')
          throw err; // do things on tp, according to results.
        }

        Session.set('edit-message','commit Ok.')
        Session.set('status-lights','status-ok')
        console.log({retv}) // here is the raw-file content
  //        const tab = window.open('http://localhost:8080/en/new-products/1466','http://localhost:8080/en/new-products/1466')
      })
  }

}) // onRendered


TP.helpers({
  fileName_or_url() {
    let s3fn = Session.get('edit-s3fpath')
    if (s3fn && s3fn.endsWith('.md')) {
      const {Bucket, subsite, xid} = utils.extract_xid2(s3fn)
      s3fn = `https://${Bucket}.com/${subsite}/${xid}`; // ~~~~~~~ to be fixed.
    }
    return s3fn;
  }
})

TP.events({
  'click .js-update': (e,tp)=>{
    e.preventDefault(); // to avoid tailing #
    console.log('js-update')
    tp.commit_article(tp)
  }
})


function install_codeMirror(tp) {
  const cm_TextArea = tp.find('#cm_TextArea'); //document.getElementById('myText');

  console.log({cm_TextArea})
  console.log(`Template.edit_article.onRendered.data:`,tp.data)
  // configure codeMirror for this app-key
  const cm = CodeMirror.fromTextArea(cm_TextArea, {
//      mode: "javascript",
//      mode: "markdown",
//      mode: "text/html",
      mode: "text/x-markdown",
//      mode: "application/x-ejs",
      lineNumbers: true,
      viewportMargin:10,
      cursorScrollMargin: 5,
      lineWrapping: true,
      matchBrackets: true,
//      keyMap:'vim',
      keyMap:'sublime',
      viewportMargin:200, // ???
      extraKeys: {
//          "Ctrl-S": commit_article.bind(tp),

        "Ctrl-S": function(instance) {
          console.log('SAVE',{instance});
          tp.commit_article(tp)
        }
//        "Ctrl-Right": next_article,
//        "Ctrl-Left": prev_article
      }
  });
  //  cm.save()
  $(".CodeMirror").css('font-size',"14px");
  $(".CodeMirror").css('line-height',"22px");
  cm.setSize('100%', '100%');
  // json to yaml.
  return cm;
} // install_codeMirror


FlowRouter.route('/admin-edit', { name: 'admin-edit',
  triggerEnter: [
    function(context, redirect) {
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    console.log(' --- queryParams:', queryParams);
    document.title = "e3-admin";
    const {host} = location;
    console.log(`@210: host:${host}`,{location})
    const {s3,create} = queryParams; // full Key for md-file
    if (!s3) throw 'INVALID PARAM'
    console.log(`@115 `,{create},{s3})
    BlazeLayout.render('admin-edit', {s3,create});
  }
});
