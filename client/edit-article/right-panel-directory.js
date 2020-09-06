import './right-panel-directory.html'
import utils from '/shared/utils.js'
import path from 'path';
import {parse_s3filename} from '/shared/utils.js'

const TP = Template.right_panel_directory;

const sdir = new ReactiveArray();

TP.onCreated(function(){
  console.log(`> onCreated right-panel-directory`)
})

TP.onRendered(function(){
  const tp = this;
  console.log(`> onRendered right-panel-directory`)
  const input = tp.find('input');
  const {Bucket, subsite} = parse_s3filename(Session.get('s3-url'));
  const ini_path = path.join(Bucket,subsite);
  input.value = ini_path
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
  'xclick.directory-item': (e,tp)=>{
    /*
      console.log(`@32 click `,{e})
      console.log(`@33 click `,e.target) // div.directory-item
      console.log(`@34 click `,e.target.baseURI) // div.directory-item
      console.log(`@35 click `,e.target.attributes.data) // div.directory-item
    */

    const fname = e.target.attributes.data.value;
    console.log(tp.s3dir,{fname})
    const s3fn = path.join(tp.s3dir,fname,'index.md')
    console.log({s3fn})
//    Session.set('s3-url',s3fn)
//    update_left_panel(s3fn)
  },
  'submit .js-lookup': (e,tp)=>{ // this is the s3dir
    e.preventDefault()
    console.log(`@44 click `,{e})
    console.log(`@45 click `,e.target) // div.directory-item
    const target = event.target;
    const s3fn = target.dirName.value;
    tp.s3dir = target.dirName.value; // could be reactive...
    console.log(`@46 submit text:${s3fn}`) // div.directory-item
    lookup_directory(tp, s3fn)
  },
  'submit form': (e,tp)=>{
    e.preventDefault()
//    console.log(`@57 submit `,{e})
//    console.log(`@58 submit target: `,e.target) // div.directory-item
//    console.log(`@58 original-event: `,e.originalEvent.submitter.name)
    const opCode = e.originalEvent.submitter.name;
    const name = e.currentTarget.attributes.name;
    if (name) {
      console.log(`@59 (${opCode}): `,name.value)
      switch(opCode) {
        case 'edit': break;
        case 'preview': break;
      }

      /* wrong
      const s3_url = Session.get('s3-url');
      const {Bucket, subsite, xid, fn} = utils.extract_subsite(s3_url)
      console.log(`@72 `,{Bucket},{subsite},{xid},{fn})
      */

      const s3fn = path.join(tp.s3dir, name.value, 'index.md')
      Session.set('s3-url', 's3://'+s3fn) // will change reactively the content.
    }
  }
})

TP.helpers({
  sdir: ()=>{
    return sdir && sdir.list(); // reactive
  }
})

// ------------------------------------------------------------------------

function lookup_directory(tp, s3prefix) {
  if (! s3prefix.startsWith('s3://')) s3prefix = 's3://'+s3prefix;

  Meteor.call('subsite-directory',s3prefix, (err,data)=>{
    if (err) throw err;

    if (data.error) {
      throw data.error
    }

    //console.log(`@20 list:`,data.list.length)
    data.list.forEach(it =>{
      //console.log(it)
    })


    const {Bucket, subsite} = utils.extract_xid2(s3prefix)

    const slength = subsite.length;
    const list = data.list.map(it =>{
      if (it.startsWith(subsite)) {
        it = it.substring(slength)
        //console.log({subsite},{it})
      }
      return it;
    })


    //console.log({list})

    sdir.splice(0,9999) // reactive var
    sdir.push(...list);
  }) // call.
} // function lookup_directory
