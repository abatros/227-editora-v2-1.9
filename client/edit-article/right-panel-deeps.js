import './right-panel-deeps.html'
import utils from '/shared/utils.js'
import path from 'path';

const TP = Template.right_panel_deep_search;

const sdir = new ReactiveArray();

TP.onCreated(function(){
  console.log(`> onCreated right-panel-deep-search`)
})

TP.onRendered(function(){
  const tp = this;
  console.log(`> onRendered right-panel-deep-search`)
  const input = tp.find('input');
  input.value = 'xxxxxxxxx'
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
  'click .directory-item': (e,tp)=>{
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
    Session.set('s3-url',s3fn)
//    update_left_panel(s3fn)
  },
  'submit .js-lookup': (e,tp)=>{
    e.preventDefault()
    console.log(`@44 click `,{e})
    console.log(`@45 click `,e.target) // div.directory-item
    const target = event.target;
    const s3fn = target.dirName.value;
    tp.s3dir = target.dirName.value; // could be reactive...
    console.log(`@46 submit text:${s3fn}`) // div.directory-item
    lookup_directory(tp, s3fn)
  },
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
