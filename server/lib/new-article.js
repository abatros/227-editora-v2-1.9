const path = require('path')
const s3 = require('./aws-s3.js')(); //({accessKeyId, secretAccessKey})

Meteor.methods({
  'new-article': async (s3_) =>{
    console.log(`new-article <${s3_}>`)
    const s3fpath = mormalize(s3_, {prefix:'s3://'});
    console.log({s3fpath})

    const {Bucket, Key} = s3.parse_s3filename(s3fpath);
    // Key: ya14/1202-Y3K2/1202-Y3K2.index.md
    console.log({Bucket},{Key})
//    const Key = `${key}/${xid}/${xid}.index.md`;
    const data = await s3.getObject({Bucket, Key}); //.Body.toString('uft8')
    if (data) {
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
    return {status:'ok', s3fpath}
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
