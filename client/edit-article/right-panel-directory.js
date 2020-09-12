import './right-panel-directory.html'
import utils from '/shared/utils.js'
import path from 'path';
import assert from 'assert';
import {parse_s3filename} from '/shared/utils.js'

const TP = Template.right_panel_directory;

const allowed_buckets = new ReactiveVar();

/*

    This autorun must react even when right-panel-directory not open.

*/

// ---------------------------------------------------------------------------

const cwd = new ReactiveArray(); // set by autorun.


Tracker.autorun(function(){
  let cwd_ = Session.get('workspace');
  console.log(`>>> @15 directory-panel::autorun <${cwd_}>`)
  if (!cwd_) {
    // clear sdir
    return;
  }

  const fdm = Session.get('full-directory-mode');
  if (fdm) {
    Meteor.call('subsite-directory', cwd_, (err,data) =>{
      if (err) {
        console.log(`@23 autorun::subsite-directory err:`, err);
        return;
      }
      if (!data) {
        console.log(`@24 autorun::subsite-directory data:`, data);
        return;
      }
      if (data.error) {
        console.log(`@27 autorun::subsite-directory data:`, data);
        return;
      }

      console.log(`@31 autorun::subsite-directory <${cwd_}> data:`,data)
      const list = data.list.map(it =>{
        const {Key,Prefix} = it; // ignore ETag LastModified..
        return {Key,Prefix, name:Key||Prefix.slice(0,-1)}
      })

      console.log(`@42 autorun::subsite-directory cwd:<${cwd_}> (${list.length})`)
      console.log(`@43 `,{list})
      cwd.splice(0,9999) // reactive var
      cwd.push(...list);
    })
  } else {
    Meteor.call('list-md-files', cwd_, (err,data) =>{
      if (err) {
        console.log(`@23 autorun::list-md-files err:`, err);
        return;
      }
      if (data.error) {
        console.log(`@27 autorun::list-md-files data:`, data);
        return;
      }

      console.log(`@31 directory-panel autorun::list-md-files Prefix:<${data.Prefix}> data:`,data)
      if (data.h) {
        display_using_hash(data);
        return;
      }

      const list = data.list.map(it =>{
        if (it.Key) {
          // it's an object MD-file - (index.md) was removed.
          if (it.Key.startsWith('/')) it.Key = it.Key.substring(1);
          return {type:"Key", Key:true, name:it.Key}
        }
        if (it.Prefix) {
          // it's an object MD-file - (index.md) was removed.
          if (it.Prefix.startsWith('/')) it.Prefix = it.Prefix.substring(1);
          return {type:"Prefix", Prefix:true, name:it.Prefix}
        }

        return it.Key || it.Prefix; // to differentiate objects and dir
        // object is implicit MD-file
      })

      console.log(`@42 autorun::list-md-files cwd:<${cwd_}> (${list.length})`)

      cwd.splice(0,9999) // reactive var cleanup.
      cwd.push(...list);
    })
  }
}) // autorun

function display_using_hash(data) {

  const h = data.h; // it's an array [key,{o:true,d:false}]
//  console.log(`@102 before sorting:`,h)
  const h2 = h.sort(); // maybe no need
//  console.log(`@102 sorted:`,h2)

  /*
      here we can have both md-file and directory!!!
  */

  const list = h2.map(it =>{
    const [key,{o,d}] = it;
    const retv = {Key:o, Prefix:d, name:key}
    console.log(`@111 it:`,retv)
    return retv;
  })

  console.log(`@42 autorun::list-md-files (${list.length})`)

  cwd.splice(0,9999) // reactive var cleanup.
  cwd.push(...list);

}



// ---------------------------------------------------------------------------

TP.onCreated(function(){
  const tp = this;
  /***************************** must be done by the caller.
  let cwd_ = Session.get('workspace');
  if (!cwd_) {
    const s3fn = Session.get('s3-url');
    if (!s3fn) {

    }
    const retv = parse_s3filename(s3fn);
    const {Bucket,Key,subsite,xid,base,ext} = retv;
//    console.error(retv)
    const cwd = path.join(Bucket,subsite)
    Session.set('workspace', cwd);
    return;
  }

  console.log(`> onCreated right-panel-directory
    workspace:<${Session.get('workspace')}>
    `);
    *****************/
})

TP.onRendered(function(){
  const tp = this;
  console.log(`> onRendered right-panel-directory`)
  const input = tp.find('input');
})

TP.events({
  'keyup': (e,tp)=>{
    ///console.log(`@8 keyCode: (${e.keyCode})`)
    if (e.key == 'Enter') { // (e.keyCode == 13)
     console.log(`Do something with (${e.target.value})`);
     let s3prefix = e.target.value;

     lookup_directory(tp, s3prefix);
    }
    return false;
  },
  'submit .js-lookup': (e,tp)=>{ // OPEN SUB DIRECTORY
    e.preventDefault()
    const s3fn = e.target.dirName.value;
    tp.s3dir = s3fn; // could be reactive...
    console.log(`@109 directory for <${s3fn}>`) // div.directory-item
    Session.set('workspace', 's3://'+s3fn)
    const fdm = Session.get('full-directory-mode');
    if (fdm) {
      lookup_directory(tp, s3fn)
    } else {
      show_directory(tp,s3fn) // only MD-files.
    }
  },
  'submit form': (e,tp)=>{
    e.preventDefault()
    const opCode = e.originalEvent.submitter.name;

    const form = e.currentTarget
    const name = form.getAttribute('name');
//    const cList = form.classList;
    const isObject = (form.classList.contains('Key'));
    console.log(`@124 (${opCode}): `,name)
    let s3dir = Session.get('workspace');
    assert(s3dir, 'workspace UNDEFINED')

    if (name) {
      console.log(`@59 (${opCode}): `,name)
      switch(opCode) {
        case 'edit': {
          console.log(`@195 edit doc <${s3dir}><${name}>`)
          return;
        }
        break;
        case 'preview': break;
        case 'enter': {
          console.log(`@195 Enter folder <${s3dir}>`)
          return;
        }
        break;
      }


      /*
          Check if folder or object.
          IF folder => dive-in

          const xv = ('.yaml .html .js .css .tex .txt /'.split(' ')).filter(it =>{
            return (name.value.endsWith(it))
          })

      */

      function fixName(name) {
        let {dir, base, ext} = path.parse(name);
        if (!ext && isObject) {
          name = path.join(base,'index.md')
        }
        return name;
      }


      const fname = fixName(name);
      let {ext} = path.parse(fname);

      if (ext) {
        // we guess it's an object....... ~~~~~
        let s3fn = path.join(s3dir, fname);
        window.history.pushState("object or string", "Title", `/edit?s3=${s3fn}`);
        Session.set('s3-url', s3fn) // will change reactively the content.
        window.history.pushState("object or string", "Title", `/edit?s3=${s3fn}`);
      } else {
        // we guess it's a folder => dive-in
        let s3fn = path.join(s3dir, name); // original
        Session.set('workspace', s3fn) // will change reactively the content.
        window.history.pushState("object or string", "Title", `/edit?s3=${s3fn}`);
      }

    }
  },
  'click .js-directory-up': (e,tp) =>{
    const s3fn =  Session.get('workspace');
    const {Bucket,Key} = parse_s3filename(s3fn);
    if (!Key) {
      console.error(`@228 ALERT we are on TOP: show all allowed-workspaces`)
      return;
    }

    const {dir,base} = path.parse(Key);
    console.log(`@233 click .js-directory-up <${Bucket}> dir:<${dir}>`)
    if (!dir) {
      console.error(`@235 ALERT we are goin on TOP`)
      Session.set('workspace', Bucket); // => autorun.
      return;
    }

    // check the requested dir is in allowed-space
    console.log(`@240 ALERT check the requested dir is in allowed-space`)

    const s3fn2 = path.join(Bucket,dir);
    Session.set('workspace', s3fn2); // => autorun.
  },
  'click .js-directory-mode': (e,tp)=>{
//    console.log(`click .js-directory-mode `,{e})
//    console.log(`click .js-directory-mode `, e.target.checked)
    Session.set('full-directory-mode',e.target.checked); // will trigger autorun
  }
})

TP.helpers({
  sdir: ()=>{
//    return sdir && sdir.list(); // reactive
    return cwd && cwd.list(); // reactive
  },
  cwd_Name() {
    /*
    const v = allowed_buckets.get();
    console.log(v)
    return ((v && v[0])||'*undefined*');
    */
    return Session.get('workspace')
  }
})

// ------------------------------------------------------------------------

function show_directory(tp, s3prefix) { // ONLY MD-files (objects without extensions)
  // THIS IS Simple - NOT full directory
  // hide non-MD files, but show sub-folders

  Meteor.call('subsite-directory',s3prefix, (err,data)=>{
    if (err) throw err;

    if (data.error) {
      throw data.error
    }

    const list = data.list.map(it =>{
      return it.Key || it.Prefix;
    })


    console.log(`@144 subsite-directory <${s3prefix}> (${list.length})`)

    sdir.splice(0,9999) // reactive var
    sdir.push(...list);
  }) // call.
} // function lookup_directory

// ---------------------------------------------------------------------------

function lookup_directory(tp, s3prefix) {
  if (! s3prefix.startsWith('s3://')) s3prefix = 's3://'+s3prefix;

  Meteor.call('subsite-directory',s3prefix, (err,data)=>{
    if (err) throw err;

    if (data.error) {
      throw data.error
    }

    const list = data.list.map(it =>{
      return it.Key || it.Prefix;
    })


    console.log(`@144 subsite-directory <${s3prefix}> (${list.length})`)

    sdir.splice(0,9999) // reactive var
    sdir.push(...list);
  }) // call.
} // function lookup_directory
