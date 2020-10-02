import './right-panel-directory.html'
import utils from '/shared/utils.js'
import path from 'path';
import assert from 'assert';
import {parse_s3filename} from '/shared/utils.js'

const verbose =0;
const TP = Template.right_panel_directory;

const allowed_buckets = new ReactiveVar();

// ---------------------------------------------------------------------------

/*

    This autorun must react even when right-panel-directory not open.

*/


const cwd = new ReactiveArray(); // set by autorun.


Tracker.autorun(function(){
  const verbose =1;
  let cwd_ = Session.get('workspace');
  if (!cwd_) {
    // clear sdir
    return;
  }

  ;(verbose >0) && console.log(`>>> @15 AUTORUN @directory-panel <${cwd_}>`)

  /*****************************************

    do not add '/' or impossible to get 'blueink/np/12**'

  ******************************************/

  if (false) {
    if (!cwd_.endsWith('/')) cwd_ += '/';
  }

  Meteor.call('list-s3objects', cwd_, (err,data) =>{
    if (err) {
      console.error(`@33 list-s3objects <${cwd_}> failed`)
      return;
    }
    if (!data || data.error) {
      console.error(`@37 list-s3objects failed: <no--data>`,{data})
      return;
    }

    /**************************
    const h = data.h;
    ;(verbose >0) && console.log(`@42 data.h `,{h})


          reformat {fname, o:{md:true,d:true,o:true}}
          into
          {fname, md:'md', d:'dir', o:'object'}


    const h_ = h.map(it => {
      const {fname, o} = it;
      return {
        fname,
        md: (o.md)?'md-file':null,
        d: (o.d)?'dir-entry':null,
      }
    })
    ******************/

    console.log(data)

    /*********************************

      DE-MUX {fn, ext:[], xdir:[]}

    **********************************/

    const h_ =[];

    data.list.forEach(it =>{
      const {fn, ext=[], xdir=[]} = it;
      ext.forEach((x)=>{h_.push({fn:fn+x})})
      xdir.forEach((x)=>{h_.push({fn:fn+x+'/', dir:'folder'})})
    })



    console.log(`>>> directory-panel::autorun <${cwd_}> ${h_.length} items`)

    cwd.splice(0,9999) // reactive var
    cwd.push(...h_);
  })

}) // autorun

// --------------------------------------------------------------------------

function display_using_hash_Obsolete(data) {

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
    ;(verbose >0) && console.log(`@111 it:`,retv)
    return retv;
  })

  ;(verbose >0) && console.log(`@42 autorun::list-md-files (${list.length})`)

  cwd.splice(0,9999) // reactive var cleanup.
  cwd.push(...list);

}



// ---------------------------------------------------------------------------

TP.onCreated(function(){
  const tp = this;
})

TP.onRendered(function(){
  const tp = this;
  ;(verbose >0) && console.log(`> onRendered right-panel-directory`)
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
//    return sdir && sdir.list(); // reactive
    const x = cwd && cwd.list(); // reactive
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
