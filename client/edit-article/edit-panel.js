import './edit-panel.html'
import assert from 'assert'
import utils from '/shared/utils.js'
import {s3fix} from '/shared/utils.js'
const path = require('path')
const yaml = require('js-yaml')
const {parse_s3filename, extract_metadata} = require('/shared/utils.js')
const TP = Template.edit_panel;



// ---------------------------------------------------------------------------

TP.onCreated(function() {
  const tp = this;
  tp.etime_ = new Date().getTime()
  tp.status_message = new ReactiveVar() // not in onRendered.
  // console.log(`@64 edit-panel.onCreated flags:`, tp.data.flags);
  console.log(`Meteor.isTest:${Meteor.isTest}`)
})


TP.onRendered(function() {
  const tp = this;
  //console.log(`@74 edit-panel.onCreated flags:`, tp.data.flags);

  const cm_TextArea = tp.find('#cm_TextArea'); //document.getElementById('myText');
  tp.cm = install_codeMirror(tp);
  //const force = FlowRouter.;
  const fpath = FlowRouter.current().path.trim();
  const force = (fpath.endsWith('--force'));

  tp.autorun(function(){
    const cm_Value = Session.get('code-mirror-data');
    if (cm_Value) {
      tp.cm.setValue(cm_Value)
    }
  })

  //console.log(`15 `,{cm_TextArea})
  //console.log(`@14 edit_panel.onRendered -done- [${new Date().getTime() - tp.etime_} ms]`)

  // moved to created tp.status_message = new ReactiveVar()
  const status_lights = tp.findAll('span.js-status-light')

  tp.set_status_light = (x) =>{
    // console.log(`@311 `, {status_lights});
    status_lights.forEach(it=>{
      // console.log(`@312 `, it.attributes.color, {it});
      if (it.id == x) {
        it.style['background-color'] = it.attributes.color.value;
      } else {
        it.style['background-color'] = 'darkgray'
      }
  //      console.log(it.style);
    })
  }

})


TP.helpers({
  status_message() {
    return Template.instance().status_message.get();
  }
})

function s3fn_to_workspace(s3fn) {
  const {Bucket, Key, ext} =  parse_s3filename(s3fn);
  if (ext == '.md') {
    // because /caltek/books/my-book/chapter-1.md
    const {dir:subsite, name:xid} = path.parse(Key);
    console.log({subsite},{xid})
    const s3dir = path.join(Bucket,subsite);
//    console.log(`@303 set workspace:<${s3dir}>`)
    return s3dir;
  }

  // here ex: /publibase/users/123876.yaml
  const {dir:subsite} = path.parse(Key);
  const s3dir = path.join(Bucket,subsite);
  return s3dir;
}


TP.events({
  'click .js-toggle-right-panel': (e, tp)=>{
      const q = Session.get('showing-right-panel')
      Session.set('showing-right-panel', !q)
      if (!q) {
        // right panel was closed.
        // we are editing a file
        // must have an extension
        // or (isObject)
        const s3fn = Session.get('s3-url')
        Session.set('workspace', s3fn_to_workspace(s3fn))
        Session.set('showing-right-panel', true);
      }
      Session.set('showing-directory-panel', true); // => create panel...
  },
  'click .js-update': (e,tp)=>{
    e.preventDefault(); // to avoid tailing #
    console.log('js-update')
    const s3_url = Session.get('s3-url')
    assert(s3_url, 'Missing s3-url@147')
    publish_article(tp, s3_url); // save, mk-html, mk-ts-vector
  },/*
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




function install_codeMirror(tp) {
  const cm_TextArea = tp.find('#cm_TextArea'); //document.getElementById('myText');

  //console.log({cm_TextArea})
  //console.log(`Template.edit_panel.onRendered.data:`,tp.data)
  // configure codeMirror for this app-key
  const cm = CodeMirror.fromTextArea(cm_TextArea, {
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
      viewportMargin:100, // ???
//        viewportMargin: Infinity, // ???
      extraKeys: {
//          "Ctrl-S": commit_article.bind(tp),

        "Ctrl-S": function(instance) {
          console.log('SAVE',{instance});
          publish_article(tp); // should be commit without publish.
        }
//        "Ctrl-Right": next_article,
//        "Ctrl-Left": prev_article
      }
  });
  cm.prev_md_file_length =0;
  //  cm.save()
  $(".CodeMirror").css('font-size',"10pt");
  $(".CodeMirror").css('line-height',"24px");
  //cm.setSize('100%', '100%');
  cm.on('keydown',(instance,e)=>{
    //Session.set('edit-status','editing')
    //console.log(`@324`,{e})
    tp.set_status_light ('status-orange')
    //Session.set('edit-message','')
    tp.status_message.set('editing'); //

    const md_file = cm.getValue();
    if (md_file.length != cm.prev_md_file_length) {
      cm.prev_md_file_length = md_file.length;
      Session.set('md-file', md_file)
    }
  })
  // json to yaml.
  return cm;
} // install_codeMirror


// --------------------------------------------------------------------------

/*
      Install a new document.
      This is called subsequently by a reactive change on Session.get('s3-url')
      Object should also give us URL of html page if source is (index.md)
      But that is known only after mk_html! or requires access to custom module.
*/

function get_s3Object(tp, s3_url, VersionId, force) {
  const etime_ = new Date().getTime();
  assert(tp)

  //s3_url = s3fix(s3_url)
  const {Bucket, Key, subsite, xid, base, ext} = parse_s3filename(s3_url);

  console.log(`@162 `,{Bucket}, {Key}, {subsite}, {xid}, {base}, {ext})
  const p1 = {Bucket, Key, VersionId};
  /*
    tp is used to update UI : reactive var mostly error and status.
  */

  Meteor.call('get-s3object',p1,(err, data)=>{
    console.log(`@54 get-e3data got-results [${new Date().getTime() - etime_} ms]`)
    /*
        Keep it here, to avoid having a Tracker.autorun !
    */
    if (err) {
      console.log('get-s3object fails:',{err})
      //Session.set('edit-status','error')
      tp.set_status_light('status-red')
      tp.status_message.set(`${err.error} - ${err.details}`);
      return;
    }

    console.log(`@112 `,{data})
    if (data.error) {
      console.log(`@206 <${s3_url}>`, data.error)
      tp.set_status_light('status-red')
//      tp.status_message.set(`file-not-found`);
      tp.status_message.set(data.error);

      if (!force) {
        try_open_directory(tp, s3_url);
        return;
      }


      if (force) {
        Session.set('edit-message','force creating file please wait...')
        Meteor.call('new-article', s3_url, (err,data)=>{
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

          if (!meta) {
            tp.cm.setValue(md);
          } else {
            // and no xid ....
            const cmValue = (meta)?`---\n${yaml.dump(meta)}---${md}`:md;
            tp.cm.setValue(cmValue);
            tp.meta = meta;
          }

          document.title = `${s3_url}`;
          //Session.set('edit-s3fpath',`${s3_url}`)
          tp.set_status_light('status-ok')
          Session.set('edit-message','ready')

          meta.s3_url = s3_url; // to verify origin.
          Session.set('meta',meta)
          Session.set('md-file', tp.cm.getValue())
        })
        return;
      }
      return;
    }


    const {ETag, VersionId, LastModified} = data;
    if (!VersionId) Session.set('live-LastModified',LastModified)
    const isLatest = (LastModified.getTime() == Session.get('live-LastModified').getTime())
    Session.set('isLatest',isLatest)
    Session.set('LastModified',LastModified)

    const lastModified = LastModified.toLocaleString();
    Session.set('lastModified',lastModified) // set only if !islive


    console.log(`@227 `,{ETag},{VersionId},{LastModified},{lastModified},{isLatest})
    console.log(`@228 ${typeof LastModified} Session.get('live-LastModified'):`, Session.get('live-LastModified'))

    const {meta, md, error} = utils.extract_metadata(data.data)

    if (error) {
      tp.set_status_light('status-red')
      tp.status_message.set(error);
      return;
    }

    /*if (!meta || !md) {
      tp.set_status_light('status-red')
      tp.status_message.set('no-data');
      return;
    }*/

    if (!meta) {
      // and no xid ....
      tp.cm.setValue(md);
    } else {
      const cmValue = (meta)?`---\n${yaml.dump(meta)}---${md}`:md;
      tp.cm.setValue(cmValue);
      tp.meta = meta;
    }

    document.title = `${s3_url}`;

    const {subsite, xid} = utils.extract_xid2(s3_url);
    Session.set('subsite',subsite)
    tp.set_status_light('status-ok')
    tp.status_message.set('ready')
    document.title = xid;
    //meta.s3_url = s3_url; // to verify origin in cache : PB change meta...

    /*
          circular reactivity
          md-file := tp.cm =>
    */


    // console.log(`@258 tp.cm:`,tp.cm.getValue())
    Session.set('md-file', tp.cm.getValue())
    Session.set('meta',meta)
    // Session.set('md-file',md)
  })

} // get_s3Object

// -------------------------------------------------------------------------

async function try_open_directory(tp, s3_url) {
  console.log(`@297 try_open_directory(${s3_url})`)
  const {Bucket, Key, subsite, xid, base, ext} =  parse_s3filename(s3_url);
  console.log(`@298 `,Bucket, Key, subsite, xid, base, ext)
  if (ext) {
    const {dir} = path.parse(Key); // move-up 1 step
    const s3dir = path.join(Bucket,dir);
    console.log(`@303 set workspace:<${s3dir}>`)
    Session.set('showing-right-panel', true);
    Session.set('showing-directory-panel',true)
    Session.set('workspace',s3dir)
  }
}



// -------------------------------------------------------------------------

function publish_article(tp, s3_url) {
  const verbose =0;
  tp.set_status_light('status-busy')

  s3_url = s3_url || Session.get('s3-url');
  assert(s3_url, 'Missing u3-url@393')

  const {meta, md} = extract_metadata(tp.cm.getValue())

  if (meta) {
    Object.assign(meta,{
      _userId: Session.get('userId'),
      _revisionDate: new Date()
    })
  }

  //console.log({meta})


  const data = (meta)? `---\n${yaml.dump(meta)}---${md}\n`:md;

  const params = {
    s3_url: s3_url, // must be full Key for md-file.
    update:true,
    data
  }

   //console.log({params});



  Meteor.call('publish-s3data', params, (err,data)=>{
      if (err) {
        tp.set_status_light('status-red')
        console.error(`@442 [${module.id}] err=>`, err)
        tp.status_message.set(err.message);
//        throw err; // do things on tp, according to results.
        return;
      }

      if (data.error) {
        tp.set_status_light('status-red')
        tp.status_message.set(data.err_msg)
        return;
      }

      tp.set_status_light('status-ok')
      tp.status_message.set('commit Ok.')
      if (meta) {
        Session.set('last-revision-date',meta._revisionDate.toLocaleString())
        Session.set('last-revision-author',meta._userId);
      }
      return;
    }
  )
}
