const s3 = require('./aws-s3.js')(); //({accessKeyId, secretAccessKey})

Meteor.methods({
  'get-s3object': async (cmd) =>{
    return get_s3object(cmd)
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

async function get_s3object(cmd) {
  let {s3fpath} = cmd
  const {host, pathname, xid} = cmd
  console.log('@17: Entering get-s3object ',{cmd})

  if (s3fpath) { // ex: s3://blueink/ya14/1202-Y3K2/1202-Y3K2.index.md

    const {Bucket, Key} = parse_s3filename(s3fpath);
    // Key: ya14/1202-Y3K2/1202-Y3K2.index.md
    console.log({Bucket},{Key})
//    const Key = `${key}/${xid}/${xid}.index.md`;
    const retv = await s3.getObject({Bucket, Key}); //.Body.toString('uft8')
    if (!retv) {
      console.log(`file-not-found : `,{Bucket},{Key})
      return {err:'file-not-found'}
    }

    console.log(`@34 `, {retv})
    const {LastModified, ETag, VersionId, etime, Body} = retv;
    return Object.assign({},{
      LastModified, ETag, VersionId, etime,
      data: Body.toString('utf8')
    })
  }

  throw '@38 MUST BE S3://BUCKET'

}
