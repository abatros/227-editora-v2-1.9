
const assert = require('assert')
const AWS = require('aws-sdk');
const util = require('util')
const path = require('path')
const {parse_s3filename} = require('/shared/utils.js')

const endpoint='us-east-1.linodeobjects.com'



// -------------------------------------------------------------------------

let _s3client;

module.exports = s3connect;


function get_accessKeys() {
  const env1 = process.env.METEOR_SETTINGS && JSON.parse(process.env.METEOR_SETTINGS)
  if (env1) {
    const {accessKeyId, secretAccessKey} = env1;
    return {accessKeyId, secretAccessKey}
  }
  const {accessKeyId, secretAccessKey} = process.env;
  return {accessKeyId, secretAccessKey}
}





function s3connect(env={}) {

  if (!_s3client) { // single

    const {accessKeyId, secretAccessKey} = get_accessKeys();

    // console.log({accessKeyId},{secretAccessKey})
    if (!accessKeyId) throw "@43 Missing S3 accessKeyId"
    if (!secretAccessKey) throw "@44 Missing S3 secretAccessKey"
    // for dkz: July 27, 2020.

    _s3client  = new AWS.S3({
              accessKeyId,
              secretAccessKey,
              endpoint,
              s3ForcePathStyle: true, // needed with minio?
              signatureVersion: 'v4',
    });


    /*
    Object.assign(_s3client, {
      endpoint,
//      copy_Object,
      put_Object,
      listObjects, //: listObjects.bind({_s3client}),
//      update_s3page,
//      wget: wget.bind({endpoint})
//      getObject,
})*/

//    _s3client.prototype.wget = wget;
  }
  return {
    __s3client: _s3client,
    endpoint,
    listObjects,
    getObject,
    putObject,
    readdir,
    readdir_nofix,
    parse_s3filename,
    listObjectVersions,
    deleteObject,
    deleteObjects,
    ping: ()=>{return 'pong'},
    headObject, getObjectMetadata: headObject,
    removeLatestVersion,
    copyObject,
    moveObject,
//    connect: ()=>{return _s3client},
  }
}


/**
async function put_Object(_s3client, o) { // obsolete
  const {Bucket, Key, Body} = o;
  assert(o.Bucket)
  assert(o.Key)
  assert(o.Body)

  let etime = new Date().getTime();

  return new Promise((resolve,reject) =>{
    _s3client.putObject(o, function(err, data) {
       if (err) {
         console.log("@46 Got error:", err.message);
         resolve({
           Bucket, Key,
           error:err
         })
         return;

         console.log(`@47 putObject:`, Object.assign(o,{data:null}));
         console.log("Request:");
         console.log(this.request.httpRequest);
         console.log("Response:");
         console.log(this.httpResponse);

         console.log(`@46 `,err, err.stack); // an error occurred
         reject(err)
         return;
       }
       else {
//         console.log(data);           // successful response
         resolve({
           data,
           etime: new Date().getTime() - etime
         })
       }
       data = {
        CopyObjectResult: {
         ETag: "\"6805f2cfc46c0f04559748bb039d69ae\"",
         LastModified: <Date Representation>
        }
       }
     });
  })
}
*/

// ---------------------------------------------------------------------------

async function listObjects(p1) {

  if (typeof p1 == 'string') {p1 = parse_s3filename(p1)}

  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
/*
    const p1 = {
      Bucket:'blueink',
      Prefix:'ya11/'
    }*/
    _s3client.listObjectsV2(p1, (err,data)=>{
      console.log({err})
      if (err) {
        reject(err)
        return;
      }
//      console.log(`@112: `, data.getCommonPrefixes())
      resolve(data)
    })
  })
}

// --------------------------------------------------------------------------

async function getObject(p1) {
  const verbose =1;
  const etime_ = new Date().getTime()

  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  ;(verbose >0) && console.log('@155 ',{p1})

  assert(p1.Bucket, '@173 getObject missing Bucket');
  assert(p1.Key, '@174 getObject missing Key')
  // we migt have VersionId. here


  const {Bucket,  Key, VersionId} = p1;
  const p1_ = {Bucket,  Key, VersionId};

  return new Promise((resolve, reject) =>{
    const o1 = _s3client.getObject(p1_, (err,data)=>{
      if (err) {
        // MOSTLY file-not-found
        ;(verbose >0) && console.log('@181 ',{err},{p1_})
        resolve(Object.assign(p1_, {error:err.code}));
        return;
      }

      //console.log(`@180 getObject `,{data})

      const {code, ETag, Body, LastModified} = data;
      const retv = {
        Bucket, Key,
        code, ETag, Body, VersionId, LastModified, Body,
        data: Body && Body.toString('utf8'),
        etime: new Date().getTime() - etime_
      }

      resolve(retv);
    })
  })
}

// --------------------------------------------------------------------------

function content_type(fn) {
  const {ext} = path.parse(fn);
  switch(ext.toLowerCase()) {
    case '.md' : return 'text/md';
    case '.yaml' : return 'text/yaml';
    case '.html' : return 'text/html';
    case '.css' : return 'text/css';
    case '.js' : return 'application/javascript';
    case '.json' : return 'application/json';
  }
  return 'application/text';
}


async function putObject(p1) {

  const {s3_url} = p1;

  if (s3_url) {
    const {Bucket,Key} = parse_s3filename(s3_url);
    Object.assign(p1,{Bucket,Key})
  }


  const {
    Bucket, Key,
    Body, data, // either
    ACL = 'public-read',
    ContentType = content_type(Key),
    ContentEncoding = 'utf8',
  } = p1;

  const p2 = {
      Bucket,
      Key,
      Body: Body || data,
      ACL,
      ContentType,
      ContentEncoding,
  };


  const etime = new Date().getTime()

  return new Promise((resolve, reject) =>{
    const o1 = _s3client.putObject(p1, (err,data)=>{
      if (err) {
        reject(err)
        return;
      }
      resolve(Object.assign(data,{
        etime: new Date().getTime()-etime,
      }))
    })
  })
}


module.exports.putObject = async function (cmd) {
  const verbose =1;

  let {s3_url, data:Body} = cmd
  const {host, pathname, xid} = cmd
  ;(verbose >0) && console.log('@17: Entering put-s3object ',{cmd})

  s3_url = s3fix(s3_url);


  if (s3_url) { // ex: s3://blueink/ya14/1202-Y3K2/1202-Y3K2.index.md

    const {Bucket, Key} = parse_s3filename(s3_url);
    // Key: ya14/1202-Y3K2/1202-Y3K2.index.md
    ;(verbose >0) && console.log({Bucket},{Key})
//    const Key = `${key}/${xid}/${xid}.index.md`;
    const p2 = {
        Bucket,
        Key,
        Body,
        ACL: 'public-read',
        ContentType: content_type(Key),
        ContentEncoding : 'utf8',
    };
    ;(verbose >0) && console.log(`put_s3object `,{p2})
    const retv1 = await s3.putObject(p2);
    ;(verbose >0) && console.log({retv1})

    return {status:'ok', s3_url, Bucket, Key}
  } // s3fpath

  throw '@38 MUST BE S3://BUCKET'

}


// --------------------------------------------------------------------------

async function readdir_chunk(p1) {
  const {Bucket, Prefix, Delimiter} = p1;
  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
    console.log({p1})
    _s3client.listObjectsV2(p1, (err,data)=>{
      if (err) {
        console.log({err})
        reject(err)
        return;
      }
//      console.log(`@112: `, data.getCommonPrefixes())
      resolve(data)
    })
  })
}

async function readdir_nofix(p1) {
  const verbose =1;

  ;(verbose >0) && console.log(`@319 Entering readdir_nofix `,{p1})

  const {Bucket, Prefix, Delimiter} = p1;

//  const pi = Object.assign({},{Bucket, Prefix, Delimiter})
  const CommonPrefixes =[];
  const Contents =[];
  let _Prefix;

  while (true) {
    const data = await readdir_chunk(p1);
    //;(verbose>0) &&
    ;(verbose >0) && console.log(`@197 readdir:`,data)
//    ;(verbose >0) && console.log(`@198 readdir ():`,data.CommonPrefixes)
//    prefixes.push(...data.CommonPrefixes)
//    objects.push(...data.Contents)
    CommonPrefixes.push(...data.CommonPrefixes)
    Contents.push(...data.Contents)
    _Prefix = _Prefix || data.Prefix;
    if (!data.IsTruncated) break;
    p1.ContinuationToken = data.NextContinuationToken;
  }

//  ;(verbose >0) && console.log(`@268 `,{objects},{prefixes})
  return {Contents, CommonPrefixes, Prefix:_Prefix};
}


async function readdir(p1) {
  const verbose =1;

  if (typeof p1 == 'string') {p1 = parse_s3filename(p1)}

  const {Bucket, Key} = p1;
  let {Prefix, Delimiter ='/'} = p1;

  if (!Prefix) {
    Prefix = (Key.endsWith('/'))?Key:Key+'/';
  }
  p1 = {Bucket, Prefix, Delimiter}

  /*
  if (typeof p1 == 'string') {
    if (! p1.startsWith('s3://')) p1 = 's3://'+p1;
    const {Bucket, Key} = parse_s3filename(p1)
    const Prefix = (Key.endsWith('/'))?Key:Key+'/';
  } */

  assert(Bucket, 'Bucket is Missing (readdir)')
  ;(verbose >0) && console.log(`@261 aws-s3.js `,{p1})

  if (p1.Prefix == '/') { // FIX !
    // p1.Delimiter='';
    p1.Prefix='';
  }
  ;(verbose >0) && console.log(`@267 aws-s3.js `,{p1})

  if (false && p1.Prefix.endsWith('/')) {
    p1.Prefix = p1.Prefix.substring(0,p1.Prefix.length-1); // WRONG
  }
  ;(verbose >0) && console.log(`@272 aws-s3.js `,{p1})

//  const {Bucket, Prefix, Delimiter, verbose=0} = p1;
//  const pi = Object.assign({},{Bucket, Prefix, Delimiter})
  const objects =[];
  const prefixes =[];
  const list =[];
  let _Prefix;

  while (true) {
    const data = await readdir_chunk(p1);
    //;(verbose>0) &&
    ;(verbose >0) && console.log(`@197 readdir:`,data)
//    ;(verbose >0) && console.log(`@198 readdir ():`,data.CommonPrefixes)
//    prefixes.push(...data.CommonPrefixes)
//    objects.push(...data.Contents)
    list.push(...data.CommonPrefixes)
    list.push(...data.Contents)
    _Prefix = _Prefix || data.Prefix;
    if (!data.IsTruncated) break;
    pi.ContinuationToken = data.NextContinuationToken;
  }

  ;(verbose >0) && console.log(`@268 `,{objects},{prefixes})
  return {list, Prefix:_Prefix};
}

// --------------------------------------------------------------------------

async function listObjectVersions(p1) {

  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  const {Bucket, Key, Delimiter='/'} = p1;
  const {Prefix=Key} = p1;

  const p2 = {
    Bucket, Prefix, Delimiter
  }

  return new Promise((resolve,reject)=>{
    assert(Bucket)
    assert(Prefix)
    _s3client.listObjectVersions(p2, (err,data)=>{
      if (err) {
        console.log({err})
        reject(err)
        return;
      }
//      console.log(`@112: `, data.getCommonPrefixes())
      /*
        data
          Name (Bucket name)
          Prefix
          Versions []
            ETag, Size, Key, VersionId, IsLatest, LastModified
          DeleteMarkers []
           Key, VersionId, IsLatest, LastModified
          CommonPrefixes []
      */
      resolve(data)
    })
  })
} // listObjectVersions

// ---------------------------------------------------------------------------

async function deleteObject(p1) {

  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  const {Bucket,  Key, VersionId} = p1;
  assert(p1.Bucket)
  assert(p1.Key)

  const p1_ = {Bucket,  Key, VersionId};

  return new Promise((resolve,reject)=>{
    _s3client.deleteObject(p1_, (err,data)=>{
      if (err) {
        console.log(`@355 aws-s3.deleteObject`, {err})
        reject(err)
        return;
      }
      // console.log(`@359 deleteObject`, {data})
      resolve(data)
    })
  })
} // deleteObject


async function deleteObjects(p1) {

  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
    assert(p1.Delete)
    _s3client.deleteObjects(p1, (err,data)=>{
      if (err) {
        console.log({err})
        reject(err)
        return;
      }
//      console.log(`@112: `, data.getCommonPrefixes())
      resolve(data)
    })
  })
} // deleteObjects


async function headObject(p1) {
  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }
  ;(!p1.Bucket) && console.log(`@276 `,p1)
  ;(!p1.Key) && console.log(`@277 `,p1)
  assert(p1.Bucket)
  assert(p1.Key)


  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
    assert(p1.Key)
    _s3client.headObject(p1, (error,data)=>{
      if (error) {
//        console.log(`@281 `,{error})
        resolve({error})
        return;
      }
//      console.log(`@112: `, data.getCommonPrefixes())
      resolve(data)
    })
  })
}

// ------------------------------------------------------------------------

async function removeLatestVersion(p1) {
  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }
  assert(p1.Bucket)
  assert(p1.Key)

  const retv1 = await headObject(p1)
  if (!retv1.VersionId) {
    console.log(`@357 file-not-found <${Bucket}><${Key}>`,{retv1})
    return retv1; // noting to delete
  }

  const {VersionId} = retv1;
  Object.assign(p1,{VersionId})
  console.log(`@362 removing latest version <${VersionId}>`,{p1})
  const retv2 = await deleteObject(p1)
  console.log(`@363 latest version <${VersionId}> removed :`,{retv2})

  return retv2;
}

// --------------------------------------------------------------------------


async function copyObject(params) {
  const {Bucket, CopySource, Key, ACL, ContentType} = params;

  assert(Bucket, `Missing Bucket @547`)
  assert(CopySource, `Missing CopySource @548`)
  assert(Key, `Missing Key @548`)

//  return _s3client.copyObject({Bucket, CopySource, Key, ACL, ContentType}).promise();
  return _s3client.copyObject(params).promise();
}

// --------------------------------------------------------------------------

async function moveObject(params) {
  const {Bucket, CopySource, Key} = params;
  assert(Bucket, Object.assign(params, {error:`Missing Bucket @556`}))
  assert(CopySource, Object.assign(params, {error:`Missing CopySource @557`}))
  assert(Key, Object.assign(params, {error:`Missing Key @558`}))

  try {
    await copyObject({Bucket, CopySource, Key});
    await deleteObject({Bucket, Key:CopySource});
    return Object.assign(params, {error:null})
  }
  catch(err) {
    throw err;
  }
}





// --------------------------------------------------------------------------
