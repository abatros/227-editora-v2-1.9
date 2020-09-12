import assert from 'assert';
import {customAlphabet, customRandom} from 'nanoid';
// const nanoid = customRandom('1234567890',4);
import sha1 from 'sha1';

import './right-panel-info.html'
import {parse_s3filename} from '/shared/utils.js'
// cache


const TP = Template.right_panel_info;
const versions = new ReactiveArray();

function hashCode(str) {
  return str.split('').reduce((prevHash, currVal) =>
    (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
}


TP.onCreated(function() {
  const tp = this;
  tp.refresh_requested = new ReactiveVar();
})

TP.onRendered(function() {
  const tp = this;
  tp.autorun(()=>{
    const s3_url = Session.get('s3-url');
    const rr = tp.refresh_requested.get()
    Meteor.call('get-s3Object-versions',s3_url,(err,data)=>{
      if (err) throw err;
      console.log(`@13 `,{data}) // array

      versions.splice(0,9999)
      versions.push(...data);
      console.log(`@22 `,versions.list())
    })
  })
})

TP.helpers({
  versions: ()=>{
//    const tp = Template.instance();
    const retv = versions && versions.list(); // reactive
    console.log(`@29 `,retv)
    const retv2 = retv.map(it=> {
      return Object.assign(it, {
        lastModified:it.LastModified.toLocaleString(),
        checksum: (hashCode(it.VersionId)%10000),
      })
    });
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
    tp.refresh_requested.set(new Date().getTime());
    console.log('refresh')
  }
})

// -----------------------------------------------------------------------

async function purge_versions(tp, s3_url) {
  const list = versions.array();
  const v = list.filter((it,j) =>{
   const {Etag, IsLatest, Size, VersionId, LastModified, lastModified} = it;
   return (IsLatest == false)
 })

 assert(v.length == list.length-1, '@73 purge-versions');

 const {Bucket,Key} = parse_s3filename(s3_url);
// v.forEach((it,j)
 for (it of v){
   const {Etag, IsLatest, Size, VersionId, LastModified, lastModified} = it;
   console.log(`-- [${Size}] delete ${Bucket}/${Key} version:[${VersionId}]`)
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
  }
  console.log(`@54 delete-revision:`,{p1})
  return new Promise((resolve,reject) =>{
    Meteor.call('delete-object',p1,(err,data)=>{
      if (err) throw err;
      console.log(`@70 deleted retv:`,data)
      resolve(true)
    })
  })
}

// ------------------------------------------------------------------------
