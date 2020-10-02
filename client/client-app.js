import assert from 'assert'
import utils from '/shared/utils.js'
import {s3fix} from '/shared/utils.js'
const path = require('path')
const yaml = require('js-yaml')
const {parse_s3filename, extract_metadata} = require('/shared/utils.js')

// ---------------------------------------------------------------------------
/*
      Current document must stay in the cache.
*/

//const codeMirror_Value = new ReactiveVar();

const verbose =0;

Tracker.autorun(function(){
  let s3fn = Session.get('s3-url')
  if (!s3fn) return;

  s3fn = s3fn.trim() // could have "--force" as option !!!
  let force_create =false;

  const VersionId = Session.get('VersionId')
//  console.log(`>>> [${module.id}] Tracker.autorun: <${s3fn}> VersionId:[${VersionId}]`)
  console.log(`>>> AUTORUN (s3-url): <${s3fn}> VersionId:[${VersionId}]`)

  if (s3fn.endsWith('--force')) {
    s3fn = s3fn.slice(0,-('--force'.length));
    // NOT YET !!!! Session.set('s3-url',s3fn);

    /***************************************

    (if document exists) : remove '--force' and reset s3-url
    (if not) : create document and reset s3-url

    ****************************************/

    Meteor.call('get-object-metadata',s3fn, async (err,data)=>{
      //if (err) throw err;
      if (err || !data) {
        console.error({err})
        console.error({data})
        throw 'fatal@41 Missing data'
      } else if (data.error) {
        await create_document(s3fn)
        Session.set('s3-url',s3fn)
      } else {
        // here document already exists.
        console.warn(`Autorun s3-url:<${s3fn}> Ignoring option --force`)
        Session.set('s3-url',s3fn)
      }
    })
    return; // important

//    force_create =true;
  }

//  get_s3Object(tp, s3fn, VersionId, force); // THIS WILL INSTALL DATA IN CODE MIRROR.
  const {Bucket, Key, subsite, xid, base, ext} = parse_s3filename(s3fn);
  /***** Obsolete
  if (!ext) {
    console.error(`ALERT this is not a MD-file <${s3fn}> fixing...`)
    s3fn = path.join(s3fn,'index.md')
  } *******/

  /************************************************************
    (1) Get document Object.
  *************************************************************/

  s3fn = path.join(Bucket,Key); // to remove s3://
  Meteor.call('get-s3object',s3fn, async (err, data)=>{
    if (err) {
      console.error(`@30 get-s3object:<${s3fn}>`,{err})
      return;
    }
    if (!data) {
      console.error(`@34 get-s3object:<${s3fn}> missing-data`); // bad
      return;
    }
    if (data.error) {
      console.error(`@38 get-s3object(${s3fn}) (force_create:${force_create})=> `,data.error);
      if ((data.error == 'NoSuchKey')&&(force_create)) {
        const cm_text = await create_document(s3fn);
        Session.set('code-mirror-data',cm_text);
  // Already set      Session.set('s3-url',s3fn); // will re-run this to get the doc.
        // so do we need to set CM ?
        return
      }
      // try a directory.
      Session.set('workspace',Session.get('s3-url')) // the original.
      Session.set('showing-right-panel',true)
      Session.set('showing-directory-panel',true)
      Session.set('s3-url',null); // to close left-panel
      // this will activate directory-panel
      return;
    }


    ;(verbose >0) && console.log(`@37 data for codeMirror is ready.`,{data})

    const {_meta, cm_Value} = remove_revisionDate(data.data)

    ;(verbose >0) && console.log({_meta})

    const {Bucket,Key,LastModified,etime} = data; // what for ?
//    codeMirror_Value.set(cm_Value)
    Session.set('code-mirror-data',cm_Value);
  })

  /************************************************************
    (2) Get Versions
  *************************************************************/

  Meteor.call('get-s3object-versions',s3fn, async (err, data)=>{
    if (err) {
      console.error(`@70 `,{err})
      return;
    }
    if (!data) {
      console.error(`@71 missing-data`); // bad
      return;
    }
    if (data.error) {
      console.error(`@72 get-s3object-versions(${s3fn}) => `,data.error);
    }

    ;(verbose >0) && console.log(`@82 get-s3object-versions =>`,data)

  })

  /************************************************************
    (3) Get current directory
  *************************************************************/

  ;(verbose >0) && console.log(`@100 [${module.id}] CWD:`, path.join(Bucket,subsite))

});

// -------------------------------------------------------------------------

function remove_revisionDate(data) {
  const {meta,md} = extract_metadata(data)
  if (!meta) {
    return {
      userId:null, revisionDate:null, cm_Value:md
    }
  }

  const _meta ={};
  const meta2 ={};

  Object.keys(meta).forEach(key =>{
    if (key.startsWith('_')) _meta[key] = meta[key];
    else meta2[key] = meta[key];
  });

  //console.log({_meta})

  if (_meta._revisionDate)
      Session.set('last-revision-date','@'+_meta._revisionDate.toLocaleString())
  else
    Session.set('last-revision-date',null)

  if (_meta._userId)
    Session.set('last-revision-author',_meta._userId)
  else
    Session.set('last-revision-author',null)

  const cm_Value = `---\n${yaml.dump(meta2)}---` + md;

  return {
    _meta, cm_Value
  }
}



// -------------------------------------------------------------------------

async function create_document(s3fn) {
  const verbose =0;
  ;(verbose >0) && console.log(`@70 create document <${s3fn}>`)

  /*
  cm_Value = 'fake new doc'
  Session.set('code-mirror-data',cm_Value)
  */

  const params ={
    s3_url: s3fn,
    data: `new doc ${s3fn}\n`
  }


  const {ext} = path.parse(s3fn);

  switch(ext) {
    case '.yaml': params.data = 'key: value\n';
    break;
    case '.md': params.data = `---\nfn: ${s3fn}\n---\n\n# Headline\n`;
    break;
  }

  return new Promise((resolve,reject) =>{
    Meteor.call('put-s3object', params, (err,data) =>{
      if (err) {
        console.error(`@103 [${module.id}]`, err)
        throw err;
      }
      ;(verbose >0) && console.log(`@85 create-document put-s3object =>`,data)
      resolve(params.data)
    }) // call
  }) // Promise
} // create-document
