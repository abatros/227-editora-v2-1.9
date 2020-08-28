const path = require('path')
const s3 = require('./aws-s3.js')(); //({accessKeyId, secretAccessKey})

Meteor.methods({
  'put-s3object': async (cmd) =>{
    return put_s3object(cmd)
  }
});


/*

      ONLY from S3://bucket
      but could be extended to database.

      data: {
        AcceptRanges: 'bytes',
        LastModified: 2020-08-24T22:04:37.000Z,
        ContentLength: 195,
        ETag: '"57e927819cc35465cd0e472a6686f4fa"',
        VersionId: '8tQdAHOzwyENOpWuV8HFq..7YH6wkT7',
        ContentType: 'binary/octet-stream',
        Metadata: {
           's3cmd-attrs': 'atime:1598306668/ctime:1598306668/gid:1000/gname:dkz/md5:57e927819cc35465cd0e472a6686f4fa/mode:33204/mtime:1598306668/uid:1000/uname:dkz'
        },
        StorageClass: 'STANDARD',
        Body: <Buffer>,
        etime: 317
     }

*/

async function put_s3object(cmd) {
  let {s3fpath, data:Body} = cmd
  const {host, pathname, xid} = cmd
  console.log('@17: Entering put-s3object ',{cmd})

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

  if (s3fpath) { // ex: s3://blueink/ya14/1202-Y3K2/1202-Y3K2.index.md

    const {Bucket, Key} = s3.parse_s3filename(s3fpath);
    // Key: ya14/1202-Y3K2/1202-Y3K2.index.md
    console.log({Bucket},{Key})
//    const Key = `${key}/${xid}/${xid}.index.md`;
    const p2 = {
        Bucket,
        Key,
        Body,
        ACL: 'public-read',
        ContentType: content_type(Key),
        ContentEncoding : 'utf8',
    };
    console.log(`put_s3object `,{p2})
    const retv1 = await s3.putObject(p2);
    console.log({retv1})

    return {status:'ok', s3fpath, Bucket, Key}
  } // s3fpath

  throw '@38 MUST BE S3://BUCKET'

}
