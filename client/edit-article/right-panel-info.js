import assert from 'assert';
import {customAlphabet, customRandom} from 'nanoid';
// const nanoid = customRandom('1234567890',4);
import sha1 from 'sha1';

import './right-panel-info.html'
import {parse_s3filename} from '/shared/utils.js'
// cache

// --------------------------------------------------------------------------

const versions = new ReactiveArray();
const versions_timeStamp = new ReactiveVar();

Tracker.autorun(()=>{
  const verbose =0;
  const s3_url = Session.get('s3-url');
  if (!s3_url) return;

  const timeStamp = versions_timeStamp.get();
  Meteor.call('get-s3object-versions',s3_url,(err,data)=>{
    if (err) throw err;
    ;(verbose >0) && console.log(`@13 get-s3object-versions =>`,{data}) // array

    versions.splice(0,9999)
    versions.push(...data);
    versions.sort((a,b)=>{
      return (b.LastModified.getTime() - a.LastModified.getTime())
    })

    ;(verbose >0) && console.log(`@22 `,versions.array());
  })
});

// --------------------------------------------------------------------------

const TP = Template.right_panel_info;

function hashCode(str) {
  return str.split('').reduce((prevHash, currVal) =>
    (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
}




TP.onCreated(function() {
  console.log(`info-panel.onCreated`)

  const tp = this;
  tp.refresh_requested = new ReactiveVar();
})

TP.onRendered(function() {
  const tp = this;
})

TP.helpers({
  versions: ()=>{
//    const tp = Template.instance();
    const retv = versions && versions.list(); // reactive
    const retv2 = retv.map(it=> {
      return Object.assign(it, {
        lastModified:it.LastModified.toLocaleString(),
        checksum: (hashCode(it.VersionId)%10000),
      })
    });
    console.log(`@29 `,retv2)
    return retv2;
  }
})

TP.events({
  'submit': (e,tp)=>{
    e.preventDefault()
    const opCode = e.originalEvent.submitter.name;
    const attribs = e.currentTarget.attributes;
    console.log(`@41 submitter.name:${opCode}`,{e})
    console.log(`@43 ETag:${attribs.ETag.value}`)
    console.log(`@44 VersionId:${attribs.VersionId.value}`)

    if (opCode == 'delete-btn') {
      delete_revision(tp, attribs.VersionId.value);
      return;
    }


    // will trigger autorun in edit-panel
    Session.set('VersionId',attribs.VersionId.value);
  }
})

TP.events({
  'click .js-purge': (e,tp)=>{
    purge_versions(tp, Session.get('s3-url'))
  },
  'click .js-refresh': (e,tp)=>{
//    tp.refresh_requested.set(new Date().getTime());
    console.log('refresh')
    versions_timeStamp.set(new Date().getTime())
  }
})

// -----------------------------------------------------------------------

async function purge_versions(tp, s3_url) {
  const list = versions.array();

  const v = list.filter((it,j) =>{
   const {ETag, IsLatest, VersionId, Size=null} = it;
   return (IsLatest == false)
 })

 assert(v.length == list.length-1, '@73 purge-versions');

 const {Bucket,Key} = parse_s3filename(s3_url);
// v.forEach((it,j)
 for (it of v){
   const {ETag, IsLatest, VersionId, Size} = it;
   console.log(`-- [${Size}] delete ${Bucket}/${Key} version:[${VersionId}] ETag:[${ETag}]`)
   await delete_revision(tp,VersionId)
 }

 console.log('>> PURGE DONE.')
}

// -----------------------------------------------------------------------

function delete_revision(tp, VersionId) {
  const {Bucket,Key} = parse_s3filename(Session.get('s3-url'))
  const p1 = {
    Bucket,
    Key,
    VersionId,
    BypassGovernanceRetention: true,
  }
  console.log(`@54 delete-revision:`,{p1})
  return new Promise((resolve,reject) =>{
    Meteor.call('delete-s3object',p1,(err,data)=>{
      if (err) throw err;
      console.log(`@70 deleted retv:`,data)
      resolve(true)
    })
  })
}

// ------------------------------------------------------------------------
