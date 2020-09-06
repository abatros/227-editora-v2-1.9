const path = require('path')
const s3 = require('./aws-s3.js')(); //({accessKeyId, secretAccessKey})
const {parse_s3filename} =  require('/shared/utils.js')
Meteor.methods({
  'new-article': async (s3fpath) =>{
    console.log(`new-article <${s3fpath}>`)
//    const s3fpath = mormalize(s3_, {prefix:'s3://'});
    console.log({s3fpath})

    const {Bucket, Key} = parse_s3filename(s3fpath);
    // Key: ya14/1202-Y3K2/1202-Y3K2.index.md
    console.log({Bucket},{Key})
//    const Key = `${key}/${xid}/${xid}.index.md`;
    const data = await s3.getObject({Bucket, Key}); //.Body.toString('uft8')
    if (data.ETag) {
      return {status:'file-already-exists', data}
    }

    const Body = `---
title: undefined-title
xid: ${Key}
---
# H1:MAIN-TITLE
`;

    const p2 = {
      Bucket,
      Key,
      Body,
      ACL: 'public-read',
      ContentType: 'text/md',
      ContentEncoding : 'utf8',
    };
    console.log(`commit_s3data `,{p2})
    const retv1 = await s3.putObject(p2);
    console.log({retv1})

    const retv = await s3.getObject({Bucket, Key}); //.Body.toString('uft8')
    if (!retv || retv.error || !retv.Body) {
      console.log(`file-not-found : `,{Bucket},{Key})
      return {error:'file-not-found'}
    }

    const {ETag, VersionId} = retv;
    return {
      ETag, VersionId,
      data: retv.Body.toString('utf8'),
    }
  }
})


function mormalize(s3, o={}) {
  const {prefix=''} = o
  if (s3.startsWith('s3://')) s3 = s3.substring(5);

  if (s3.endsWith('index.md')) return prefix + s3;

  const {dir,name,base,ext} = path.parse(s3);
  if (!ext) {
    return prefix + path.join(dir,name,'index.md')
  }

  return prefix + path.join(dir,'index.md')
}
