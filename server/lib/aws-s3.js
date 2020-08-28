
const assert = require('assert')
const AWS = require('aws-sdk');
const util = require('util')

const endpoint='us-east-1.linodeobjects.com'


function parse_s3filename(fn) {
  const v = fn.match(/s3:\/\/([^\/]+)\/(.+)$/)
  if (v && v.length ==3) {
    return {
      Bucket: v[1], Key: v[2]
    }
  }
  return {Bucket:null, Key:null}
} // parse_s3_filename

let s3client;

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

  if (!s3client) { // single

    const {accessKeyId, secretAccessKey} = get_accessKeys();

    // console.log({accessKeyId},{secretAccessKey})
    if (!accessKeyId) throw "@43 Missing S3 accessKeyId"
    if (!secretAccessKey) throw "@44 Missing S3 secretAccessKey"
    // for dkz: July 27, 2020.

    s3client  = new AWS.S3({
              accessKeyId,
              secretAccessKey,
              endpoint,
              s3ForcePathStyle: true, // needed with minio?
              signatureVersion: 'v4',
    });


    /*
    Object.assign(s3client, {
      endpoint,
//      copy_Object,
      put_Object,
      listObjects, //: listObjects.bind({s3client}),
//      update_s3page,
//      wget: wget.bind({endpoint})
//      getObject,
})*/

//    s3client.prototype.wget = wget;
  }
  return {
    s3client,
    endpoint,
    listObjects,
    getObject,
    putObject,
    readdir,
    parse_s3filename,
    listObjectVersions,
    deleteObject,
    deleteObjects,
    ping: ()=>{return 'pong'},
    headObject, getObjectMetadata: headObject,
  }
}


async function put_Object(s3client, o) { // obsolete
  const {Bucket, Key, Body} = o;
  assert(o.Bucket)
  assert(o.Key)
  assert(o.Body)

  let etime = new Date().getTime();

  return new Promise((resolve,reject) =>{
    s3client.putObject(o, function(err, data) {
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
       /*
       data = {
        CopyObjectResult: {
         ETag: "\"6805f2cfc46c0f04559748bb039d69ae\"",
         LastModified: <Date Representation>
        }
       }
       */
     });
  })
}


async function listObjects(p1) {
  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
/*
    const p1 = {
      Bucket:'blueink',
      Prefix:'ya11/'
    }*/
    s3client.listObjectsV2(p1, (err,data)=>{
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

async function getObject(p1) {
  const etime = new Date().getTime()

  if (typeof p1 == 'string') {
    p1 = parse_s3filename(p1)
  }

  ;(! p1.Bucket) && console.log('@155 ',{p1})
  assert(p1.Bucket); assert(p1.Key)

  return new Promise((resolve, reject) =>{
    const o1 = s3client.getObject(p1, (err,data)=>{
      if (err) {
        // console.log(`@132:`,{err})
        if (err.code == 'NoSuchKey') {
          resolve({error:err}); return;
        }
        reject(err)
        return;
      }
      resolve(Object.assign(data,{
        etime: new Date().getTime()-etime
      }))
    })
  })
}

async function getObject_Obsolete(p1) {
  const etime = new Date().getTime()
  return new Promise((resolve, reject) =>{
    const o1 = s3client.getObject(p1, (err,data)=>{
      if (err) {
        // console.log(`@132:`,{err})
        if (err.code == 'NoSuchKey') {
          resolve(null); return;
        }
        reject(err)
        return;
      }
      resolve(Object.assign(data,{
        etime: new Date().getTime()-etime
      }))
    })
  })
}

async function putObject(p1) {
  const etime = new Date().getTime()
  return new Promise((resolve, reject) =>{
    const o1 = s3client.putObject(p1, (err,data)=>{
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


async function readdir_chunk(p1) {
  const {Bucket, Prefix, Delimiter} = p1;
  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
    console.log({p1})
    s3client.listObjectsV2(p1, (err,data)=>{
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

async function readdir(p1) {

  if (typeof p1 == 'string') {
    const {Bucket, Key} = parse_s3filename(p1)
    const Prefix = (Key.endsWith('/'))?Key:Key+'/';
    p1 = {Bucket, Prefix, Delimiter:'/'}
  }
  assert(p1.Bucket)


//  const {Bucket, Prefix, Delimiter, verbose=0} = p1;
//  const pi = Object.assign({},{Bucket, Prefix, Delimiter})
  const list =[];
  while (true) {
    const data = await readdir_chunk(p1);
    //;(verbose>0) &&
    console.log(`@198 readdir:`,data.CommonPrefixes)
    list.push(...data.CommonPrefixes)
    if (!data.IsTruncated) break;
    pi.ContinuationToken = data.NextContinuationToken;
  }
  return list;
}


async function listObjectVersions(p1) {
  const {Bucket, Key, Delimiter} = p1;
  const {Prefix=Key} = p1;

  const p2 = {
    Bucket, Prefix, Delimiter
  }

  return new Promise((resolve,reject)=>{
    assert(Bucket)
    assert(Prefix)
    s3client.listObjectVersions(p2, (err,data)=>{
      if (err) {
        console.log({err})
        reject(err)
        return;
      }
//      console.log(`@112: `, data.getCommonPrefixes())
      resolve(data)
    })
  })
} // listObjectVersions


async function deleteObject(p1) {

  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
    assert(p1.Key)
    s3client.deleteObject(p1, (err,data)=>{
      if (err) {
        console.log({err})
        reject(err)
        return;
      }
//      console.log(`@112: `, data.getCommonPrefixes())
      resolve(data)
    })
  })
} // deleteObject


async function deleteObjects(p1) {

  return new Promise((resolve,reject)=>{
    assert(p1.Bucket)
    assert(p1.Delete)
    s3client.deleteObjects(p1, (err,data)=>{
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
    s3client.headObject(p1, (error,data)=>{
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
