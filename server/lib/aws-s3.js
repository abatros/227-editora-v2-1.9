
const assert = require('assert')
const AWS = require('aws-sdk');
const util = require('util')
const path = require('path')
const yaml = require('js-yaml')

const {parse_s3filename} = require('../../shared/utils.js')

const endpoint='https://us-east-1.linodeobjects.com'



// -------------------------------------------------------------------------
const verbose =0;
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
//              region:'default',
//              http_continue_timeout: 0 //# disable 'expect: 100-continue'
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
    listObjectVersions2,
    deleteObject,
    deleteObjects,
    ping: ()=>{return 'pong'},
    headObject, getObjectMetadata: headObject,
    removeLatestVersion,
    copyObject,
    moveObject,
    purgeObject,
    putBucketVersioning,
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
  const verbose =0;
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
    const {Bucket,  Key, VersionId} = p1_;
    const {ext} = path.parse(Key)

    const o1 = _s3client.getObject(p1_, (err,data)=>{
      //console.log(`@190 ext:${ext}`)

      if (err) {
        // MOSTLY file-not-found
        ;(verbose >0) && console.log('@181 ',{err},{p1_})
        resolve(Object.assign(p1_, {error:err.code}));
        return;
      }

      //console.log(`@180 getObject `,{data})

      const {code, ETag, Body, LastModified} = data;

      //console.log(`@202 ext:${ext}`)

      const retv = {
        Bucket, Key,
        code, ETag, Body, VersionId, LastModified, Body,
        data: Body && Body.toString('utf8'),
        etime: new Date().getTime() - etime_
      }

      ;(verbose >0) && console.log('getObject => ',retv)
      resolve(retv);
    })
  })
}

// --------------------------------------------------------------------------

function content_type(fn) {
  const {ext} = path.parse(fn);
  switch(ext.toLowerCase()) {
    case '.md' : return 'text/plain';
    case '.yaml' : return 'text/yaml';
    case '.html' : return 'text/html;charset=utf8';
    case '.css' : return 'text/css';
    case '.js' : return 'application/javascript';
    case '.json' : return 'application/json';
  }
  return 'text/plain';
}


async function putObject(...p1) {
  const verbose =1;
  // p1 is an array.

  //console.log(`@239 `,{p1})

  function parse_args(p1) {
    const verbose =1;
    assert(Array.isArray(p1));
    ;(verbose >0) && console.log(`@243 `,{p1})

    if (p1.length >2) {
      throw '@247 too many arguments'
    }
    if (p1.length == 2) {
      const [s3fn, Body] = p1;
      ;(verbose >0) && console.log(`@245 `,{s3fn})
      const {Bucket,Key} = parse_s3filename(s3fn);
      ;(verbose >0) && console.log(`@246 `,{Bucket},{Key})
      return {Bucket,Key,Body}
    }

    p1 = p1[0]
    // here it's an object
    assert(typeof p1 != 'string')

    if (!p1.Bucket) {
      const s3fn = p1.s3fn || p1.s3_url;
      assert(s3fn, "@263 missing Key");
      const {Bucket,Key} = parse_s3filename(s3fn);
      assert(p1.data, "@264 missing data");
      return {Bucket,Key,Body:p1.data}
    }

    p1.Body = p1.Body || p1.data;
    delete p1.data;
    return p1;
  }

  /*
  const {s3_url} = p1;

  ;(verbose >0) && console.log(`@225 putObject p1:`,p1);
  if (s3_url) {
    const {Bucket,Key} = parse_s3filename(s3_url);
    Object.assign(p1,{Bucket,Key})
  } */


  p1 = parse_args(p1);
  //console.log(`@264 `,{p1})
  if(!p1.Bucket || !p1.Key) {
    console.log(`@274 `,{p1})
    throw 'fatal@275';
  }

  assert(p1.Body)

  p1 = Object.assign({ // pre conditions
    ACL: 'public-read',
    ContentType: content_type(p1.Key), // automatic
    ContentEncoding: 'utf8',
  },p1)

  /*
  const {
    Bucket, Key,
    Body, data, // either
    ACL = 'public-read',
    ContentType = content_type(Key), // automatic
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
  */

  ;(verbose >0) && console.log(`@249 putObject p1:`,p1);

  const etime = new Date().getTime()

  return new Promise((resolve, reject) =>{
    _s3client.putObject(p1, (err,data)=>{
      if (err) {
        ;(verbose >0) && console.log(`@256 putObject err:`,err);
        reject(err)
        return;
      }

      Object.assign(data, {etime: new Date().getTime()-etime})
      ;(verbose >0) && console.log(`@262 putObject data:`,data);
      resolve(data);
    })
  })
}


// --------------------------------------------------------------------------

async function readdir_chunk(p1) {
  const {Bucket, Prefix, Delimiter} = p1;
  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
    // console.log(`@311 readdir_chunk`, {p1})
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
  assert(p1.Bucket)
  // assert(p1.Prefix) it's Ok to dir s3://caltek

//  const pi = Object.assign({},{Bucket, Prefix, Delimiter})
  const CommonPrefixes =[];
  const Contents =[];
  let _Prefix;

  while (true) {
    const data = await readdir_chunk(p1);
    //;(verbose>0) &&
    ;(verbose >0) && console.log(`@339 readdir:`,data)
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
  const Keys = Contents.map(it => (it.Key))
  return {Contents, CommonPrefixes, Prefix:_Prefix, Keys};
}


async function readdir(p1) {
  const verbose =0;

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
  assert(p1, `@420 [${module.id}] missing arg`)

  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  const {Bucket, Key, Delimiter='/'} = p1;
  let {Prefix=Key} = p1;
  Prefix = Prefix || '';

  const p2 = {
    Bucket, Prefix, Delimiter
  }

  return new Promise((resolve,reject)=>{
    assert(Bucket)
    //assert(Prefix)
    _s3client.listObjectVersions(p2, (err,data)=>{
      if (err) {
        console.log({err})
        reject(err)
        return;
      }

//      console.log(`@112: `, data.getCommonPrefixes())
      ;(verbose >0) && console.log(`@112: `, {data})
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

      /************
      const h ={};
      if (true) {
        data.Versions.forEach(it =>{
          console.log(`470 Version `,{it})
          const k = `${it.Key}-${it.VersionId}`
          if(h[k]) {
            console.log(`@473 already found h[${k}]`,h[k])
  //          throw 'fatal@474'
          } else {
            h[k] = it;
          }
        })
        data.DeleteMarkers.forEach(it =>{
          console.log(`470 DELETE MARKER `,{it})
          const k = `${it.Key}-${it.VersionId}`
          if(h[k]) {
            console.error(`@473 already found MARKER h[${k}]`,h[k])
          } else {
            h[k] = it;
          }
        })

      } else {
        data.Versions.forEach(it =>{
          console.log(`470 `,{it})
          assert(!h[it.LastModified]);
          h[it.LastModified] = it;
        })
        data.DeleteMarkers.forEach(it =>{
          assert(!h[it.LastModified]);
          h[it.LastModified] = it;
        })
      }
      ************/

      const odir =[];
      data.Versions.forEach(it =>{
        const {ETag, Key,VersionId,LastModified,IsLatest, Size} =it;
        odir.push({ETag, Key,VersionId, Size, LastModified, IsLatest, timeStamp:LastModified.getTime(), type:'V'})
      });
      data.DeleteMarkers.forEach(it =>{
        const {Key,VersionId,LastModified, IsLatest} =it;
        odir.push({Key,VersionId, LastModified, IsLatest, timeStamp:LastModified.getTime(), type:'DM'})
      })

      odir.forEach((it,j) =>{
        console.log(`${j} -- ${it.type} ${it.VersionId} <${it.Key}>`)
      })

      Objects = odir.map(it => {
        const {ETag, Key, VersionId, LastModified, type, IsLatest, Size=null} = it
        return {ETag, Key, VersionId, LastModified, type, IsLatest, Size}
      });

      resolve(Objects);
      return;

throw 'break@500'
      const h_ = Object.keys(h).sort().map(it=> (h[it]));

      resolve(h_)
    })
  })
} // listObjectVersions

// --------------------------------------------------------------------------

async function listObjectVersions2(p1) {
  assert(p1, `@537 [${module.id}] missing arg`)

  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  /*
      flag to skip DeleteMarkers
  */

  const {Bucket, Key, Prefix:Prefix_, Delimiter=''} = p1;
  const Prefix = Prefix_ || Key || '';

  p1 = {Bucket, Prefix, Delimiter}
  assert(Bucket)

  return new Promise((resolve,reject)=>{
    //assert(Prefix)
    _s3client.listObjectVersions(p1, (err,data)=>{
      if (err) {
        console.log({err})
        reject(err)
        return;
      }

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

      console.log(`@574 `,{data})
      console.log(`@575 CommonPrefixes ${data.CommonPrefixes.length}`)

      const odir =[];

      const h ={};
      data.Versions.forEach(it =>{
        const {ETag, Key,VersionId,LastModified,IsLatest, Size} =it;
        // here it's an object
        const {dir,name,ext="***"} = path.parse(Key);
        const Key_ = path.join(dir,name);
//        assert(!h[Key_])
        h[Key_] = h[Key_] || {};
        Object.assign(h[Key_],{
          ETag,
          Key:path.join(dir,name),
          VersionId, Size, LastModified, IsLatest,
          ext // make the difference with folders '***' == no extension Ok.
              // extension starts with dot.
        });
      });
      /*
      data.DeleteMarkers.forEach(it =>{
        const {Key,VersionId,LastModified, IsLatest} =it;
        const {dir,name,ext="***"} = path.parse(Key);
        // DeleteMarkers have no ETag
        odir.push({ETag,
          Key:path.join(dir,name),
          VersionId, Size, LastModified, IsLatest, ext})
      })*/

      data.CommonPrefixes.forEach(it =>{
        const {Prefix} = it;
        console.log(`@603 (${Prefix}) it:`,it)
        h[Prefix] = h[Prefix] || {}; // just an entry
        console.log(`@604 h[${Prefix}]:`,h[Prefix]);
        Object.assign(h[Prefix], {
          dir: true,
          ext: '***',
          Key: Prefix});

        console.log(`@605 h[${Prefix}]:`,h[Prefix]);
      });

      console.log(`@615 :`,{h});
      const keys = Object.keys(h);
      console.log(`@616 keys:`,keys)

      const Objects = keys.map(Key =>{
        return h[Key];
      })
      console.log(`@617 Objects:`,Objects)

      resolve(Objects);
    })
  })
} // listObjectVersions2


// --------------------------------------------------------------------------

async function purgeObject(p1) {

  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  const {Bucket, Key, Delimiter='/'} = p1;
  const {Prefix=Key} = p1;

  const p2 = {
    Bucket, Prefix, Delimiter
  }

  const list = await listObjectVersions(p2);

  const delete_list =[];
  for (it of list) {
    if (it.Key !== Prefix) {
      console.log(`-- ignoring <${it.Key}>`)
      continue;
    }

    console.log(`-- delete version <${it.Key}><${it.VersionId}>`)
    delete_list.push({Key:it.Key, VersionId:it.VersionId})
  }


  for (it of delete_list) {
    const {Key,VersionId} = it;
    console.log(`-- delete version <${Key}><${VersionId}>`)
    const retv = await deleteObject({Bucket,Key,VersionId})
    console.log(`   -- deleted `,{retv})
  }


  return delete_list;



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


      const h ={};
      data.Versions.forEach(it =>{
        assert(!h[it.LastModified]);
        h[it.LastModified] = it;
      })
      data.DeleteMarkers.forEach(it =>{
        assert(!h[it.LastModified]);
        h[it.LastModified] = it;
      })

      const h_ = Object.keys(h).sort().map(it=> (h[it]));

      resolve(h_)
    })
  })
} // purge


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
  const verbose =0;
  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  const {Bucket,Key} = p1;
  if (!Bucket || !Key) {
    console.log(`@770 headObject <${Bucket}><${Key}> `,p1)
    throw 'fatal@770 headObject'
  }

  p1 = {Bucket,Key};
  (verbose >0) && console.log(`@775 headObject params:`,p1)

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
} // headObject

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
  const {CopySource, Bucket, Key, ACL, ContentType} = params;
  assert(Bucket, Object.assign(params, {error:`Missing Bucket @556`}))
  assert(CopySource, Object.assign(params, {error:`Missing CopySource @557`}))
  assert(Key, Object.assign(params, {error:`Missing Key @558`}))

  try {
    const retv1 = await copyObject({Bucket, CopySource, Key, ACL, ContentType});
    console.log(`@569 moveObject retv1:`,retv1);

    // CopySource : /abatros/projects/....
    const v = CopySource.split('/')
    v.splice(0,2)
    console.log(`@573 (${v.join('|')})`)

    const retv2 = await deleteObject({Bucket, Key: v.join('/')});
    console.log(`@576 moveObject retv2:`,retv2);
    return Object.assign(params, {error:null})
  }
  catch(err) {
    throw err;
  }
}

// --------------------------------------------------------------------------

/*
ONLY IN CALLBACK....
console.log(this.request.httpRequest);
console.log(this.httpResponse);
*/
// --------------------------------------------------------------------------

function putBucketVersioning(...params) {
  switch(params.length) {
    case 1:
      assert(typeof params[0] == 'object');
      params = params[0]
      break;

    case 2:
      const [Bucket,Status] = params;
      params = {
        Bucket,
        VersioningConfiguration: { /* required */
          MFADelete: 'Disabled', // Enabled | Disabled,
          Status, // Enabled | Suspended
        },
      }
      break;
    default:
      console.error(`@708`,{params})
      throw `Invalid-signature@708`
  }
  console.log(`@719 params:`,params)
//  return _s3client.putBucketVersioning(params).promise()

  return new Promise((resolve,reject)=>{
    _s3client.putBucketVersioning(params, function(err,data) {
//      console.log(`@720 this:`,this);
//      console.log(`@721 `,this.request.httpRequest);
//      console.log(`@722 `,this.httpResponse);
      console.log(`@723 `,this.httpResponse.Body);

      if (err) {
        console.log(`@724 error:`, error)
        reject(err);
        return;
      }
      console.log(`@725 params:`, data)
      resolve(data)
    })
  })

}
