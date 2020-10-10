import './right-panel-directory.html'
import utils from '/shared/utils.js'
import path from 'path';
import assert from 'assert';
import {parse_s3filename} from '/shared/utils.js'

const verbose =1;
const TP = Template.right_panel_directory;

const allowed_buckets = new ReactiveVar();

// ---------------------------------------------------------------------------

/*

    This autorun must react even when right-panel-directory not open.

*/


const dir3list = new ReactiveArray(); // set by autorun.


let _mrw = null
let _mrp = null

Tracker.autorun(function(){
  const verbose =1;
  let cwd_ = Session.get('workspace');
  const user_profile = Session.get('user-profile');

  console.log(`@32 LOOP
    workspace <${_mrw}><${cwd_}>`);

  console.log(`@32 LOOP user-profile(-1)`,_mrp);
  console.log(`@32 LOOP user-profile`,user_profile);

  _mrw = cwd_;
  _mrp = user_profile;


  if (!cwd_) {
    // clear sdir
    return;
  }

  if (!user_profile) return;

//  assert(p, '@39 missing user-profile')

  const wslist = user_profile.subsites; //Session.get('workspaces');


  ;(verbose >0) && console.log(`>>> @15 AUTORUN @dir3-panel <${cwd_}>`)

  /*****************************************
    step 1 : remove ext if any and RETRY.
  ******************************************/

  assert(!cwd_.startsWith('s3:/'));

  /*****************************************************************

  DO NOT REMOVE ending [/]
  we need to query partial directories like:

    s3://museum/pages/19 => for 20th century !!!!!

  ******************************************************************/


  if (false && cwd_.endsWith('/')) {
    cwd_ = cwd_.slice(0,-1);
    console.warn(`@41 workspace requested ends with '/' removed.`)
  }


  const {dir,name,base,ext} = path.parse(cwd_);
  if (ext) {
    console.warn(`@41 ALERT in [${module.id}]
      workspace <${cwd_}>
      dir:<${dir}> base:<${base}>
      name:<${name}> ext:<${ext}>
      `)

throw 'fatal@47'
    Session.set('workspace',dir)
    return;
  }


  /*****************************************
    step 2 : ADJUST workspace
  ******************************************/

  if (wslist) {
    console.log(`>>>>>>>>>>>>>`,wslist)
    for (let j in wslist) {
      const ws1 = wslist[j]
      if (cwd_.indexOf(ws1)==0) { // ok
        console.log(`@48 <${ws1}><${cwd_}> ACCEPTED`)
        break; // cwd child of ws1
      }
      if (ws1 == cwd_) {
        console.log(`@49 <${ws1}><${cwd_}> ACCEPTED`)
        break;
      }
      if (ws1.indexOf(cwd_)==0) {
        // cwd_ shorter than ws1 => ADJUST workspace
        console.log(`@50 <${ws1}><${cwd_}> REJECTED new workspace:<${ws1}>`)
        ;(verbose >=0) && console.log(`@85 workspace:=<${ws1}>`)
throw 'break@102'
//        Session.set('workspace',ws1)
        return;
      }
      // last iteration and not found.
      if (j+1 == wslist.length) {
        console.log(`@51 <${ws1}><${cwd_}> REJECTED new workspace:<${wslist[0]}>`)
        ;(verbose >=0) && console.log(`@92 workspace:=<${wslist[0]}>`)
throw 'break@110'
//        Session.set('workspace',wslist[0])
        return;
      }
    } // loop
  }

  /*****************************************

    do not add '/' or impossible to get 'blueink/np/12**'

  ******************************************/


  Meteor.call('list-s3objects', cwd_, (err,data) =>{
    if (err) {
      console.error(`@33 list-s3objects <${cwd_}> failed`)
      return;
    }
    if (!data || data.error) {
      console.error(`@37 list-s3objects failed: <no--data>`,{data})
      return;
    }

    console.log(`@134 list-s3Objects<${cwd_}> => `,data);

    /*********************************

      DE-MUX {fn, ext:[], xdir:[]}

    **********************************/

    const h_ =[];

    data.list.forEach(it =>{
      const {fn, ext=[], xdir=[]} = it;
      ext.forEach((x)=>{h_.push({fn:fn+x})})
      xdir.forEach((x)=>{h_.push({fn:fn+x+'/', dir:'folder'})})
    })


    console.log(`>>> dir3-panel::autorun <${cwd_}> ${h_.length} items`)
    dir3list.splice(0,9999) // reactive var
    dir3list.push(...h_);
  })

}) // autorun

// --------------------------------------------------------------------------


// ---------------------------------------------------------------------------

TP.onCreated(function(){
  console.log(`dir3-panel.onCreated`)
  const tp = this;
  ;(verbose >0) && console.log(`dir3-panel.onCreated`)
})

TP.onRendered(function(){
  const tp = this;
  ;(verbose >0) && console.log(`dir3-panel.onRendered`)
  const input = tp.find('input');
})


TP.events({
  'keyup': (e,tp)=>{
    return; // bizarre: ENTER triggers a SUBMIT.
    if (false) {
      e.preventDefault()
      ///console.log(`@8 keyCode: (${e.keyCode})`)
      if (e.key == 'Enter') { // (e.keyCode == 13)
       ;(verbose >0) && console.log(`Do something with (${e.target.value})`);
       let s3prefix = e.target.value;
       ;(verbose >0) && console.log(`@120 session.workspace:=(${s3prefix})`) // div.directory-item
       //     Session.set('workspace', s3fn)
      }
    }
  }, // keyup

  'submit .js-lookup': (e,tp)=>{ // OPEN SUB DIRECTORY
    e.preventDefault()
    const s3fn = e.target.dirName.value;
    tp.s3dir = s3fn; // could be reactive...
    ;(verbose >0) && console.log(`@109 directory for <${s3fn}>`) // div.directory-item
    ;(verbose >0) && console.log(`@131 session.workspace:=(${s3fn})`) // div.directory-item
    ;(verbose >=0) && console.log(`@230 workspace:=<${s3fn}>`)
    Session.set('workspace', s3fn)

    /*
    const fdm = Session.get('full-directory-mode');
    if (fdm) {
      lookup_directory(tp, s3fn)
    } else {
      show_directory(tp,s3fn) // only MD-files.
    } */
  },
  'submit form.js-cwd': (e,tp)=>{
    const verbose =1;
    e.preventDefault()
    const btn_Name = e.originalEvent.submitter.name;

    const form = e.currentTarget
    const fname = form.getAttribute('name');

//    const isObject = (form.classList.contains('md-file'));
//    const isObject = (form.classList.contains('dir-entry'));
    ;(verbose >0) && console.log(`@211 submit from btn_Name: (${btn_Name}): `,name)
    let s3dir = Session.get('workspace');
    assert(s3dir, 'workspace UNDEFINED')
    //assert(btn_Name, '<opCode> UNDEFINED')
    assert(fname, '<fname> UNDEFINED')

    const w = Session.get('workspace')
    const {Bucket,Key} = parse_s3filename(w);

    /***********************************************************

    Get the correct folder:
    ex1: Session.get('workspace') => 'blueink/np/12'
    dir is: 'blueink/np'

    ex2: Session.get('workspace') => 'blueink/np/'
    dir is: 'blueink/np'


    ************************************************************/

    function get_base_Key() {
      const verbose =1;
      const v = Key.split('/')
      /**
          w:'abatros'     (Key is null) => v1 : ['']      v2:['']
          w:'abatros/'    (Key is null) => v1 : ['']      v2:['']
          w:'abatros/pro' (Key is null) => v1 : ['pro']   v2:['']
      **/
      console.log(`get_folder(${w}) =><${Bucket}><${Key}> v1:`,v)
      v.splice(-1,1) // to remove '/12' from 'np/12'
      console.log(`get_folder(${w}) =><${Bucket}><${Key}> v2:`,v)
      return v.join('/')
    } // get-base-Key

    const _Key = get_base_Key(); //path.parse(Session.get('workspace'))
    if (!_Key) {
      console.warn(`session.workspace:`,Session.get('workspace'))
      // throw 'fatal@205'  IT IS OK.
    }

    console.log(`workspace:${Session.get('workspace')}  _Key:<${_Key}>`)

    switch(btn_Name) {
      case 'folder': {
          ;(verbose >0) && console.log(`@228 CWD to <${Bucket}><${_Key}><${fname}>`)
          let s3fn = path.join(Bucket,_Key,fname);
          ;(verbose >0) && console.log(`@171 session.workspace:=(${s3fn})`) // div.directory-item
          Session.set('workspace',s3fn)
          return;
      }

      default: {
        ;(verbose >0) && console.log(`@195 edit doc <${s3dir}><${fname}> _Key:<${_Key}>`);
        let s3fn = path.join(Bucket,_Key,fname);

        /*
        if (form.classList.contains('md-file')) {
          s3fn += '.md';
        } */

        const {ext} = path.parse(s3fn);
//        const isEditable = (ext in ['.md','.yaml','.txt','.js','.css','.tex','.cfg','.config','.html'])
        const isEditable = ('.md.yaml.txt.js.css.tex.cfg.config.html.html-template.xml'.indexOf(ext)>=0)
        if (!isEditable) {
          console.error(`@172 <${s3fn}> is not-editable`)
          return;
        }

        assert(s3fn)
        ;(verbose >0) && console.log(`@177 Session.set('s3-url') <${s3fn}>`)
        Session.set('s3-url',s3fn)
        Session.set('panel','showing-edit-panel')
        return;
      }

      throw `Invalid btn_Name <${btn_Name}>`;
    }
  },
  'click .js-directory-up': (e,tp) =>{
    const s3fn =  Session.get('workspace');
    const {Bucket,Key} = parse_s3filename(s3fn);
    if (!Key) {
      console.error(`@304 ALERT we are on TOP: show all allowed-workspaces (TODO)`)
      return;
    }

    const {dir,base} = path.parse(Key);
    ;(verbose >0) && console.log(`@233 click .js-directory-up <${Bucket}> <${dir}><${base}>`)

    /***************************************

      directory always ends with (/)

    ****************************************/

    const s3fn_ = path.join(Bucket, dir+'/'); // <= !!!!!!!! possiby null
    ;(verbose >0) && console.log(`@319 click .js-directory-up workspace := <${s3fn_}>`)
    ;(verbose >0) && console.log(`@192 session.workspace:=(${s3fn_})`) // div.directory-item
    ;(verbose >=0) && console.log(`@350 workspace:=<${s3fn_}>`)
    Session.set('workspace', s3fn_); // => autorun.
  },
  'click .js-directory-mode': (e,tp)=>{
//    console.log(`click .js-directory-mode `,{e})
//    console.log(`click .js-directory-mode `, e.target.checked)
    Session.set('full-directory-mode',e.target.checked); // will trigger autorun
  }
})

TP.helpers({
  sdir: ()=>{
//return;
//    return sdir && sdir.list(); // reactive
    const x = dir3list && dir3list.list(); // reactive
    let y = x.array();
    ;(verbose >0) && console.log({y})
    const show_all = Session.get('full-directory-mode');
    /*************************************
    something wrong here - i.md incorrect
    **************************************/
    if (!show_all) {
//      y = y.filter(it => (!it.dir))
      y = y.filter(it => (it.fn.endsWith('.md')));
    }
    ;(verbose >0) && console.log({y})
    return y;
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
