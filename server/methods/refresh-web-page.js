//const s3 = require('./lib/aws-s3.js')();
const {parse_s3filename} = require('/shared/utils.js')
const path =require('path')

Meteor.methods({
  'refresh-web-page': async (s3_url) =>{
    console.log(`@6 refresh-web-page `,{s3_url});
    const {Bucket,Key,base,xid} = parse_s3filename(s3_url)
    console.log(`@9 refresh-web-page `,{s3_url},{Key},{base},{xid});
    if (!xid) {
      s3_url = 's3://' + path.join(Bucket,Key,'index.md')
    }
    return await refresh_web_page(s3_url);
  }
})


async function refresh_web_page(s3_url) {
  /*
      - get MD-file
  */

  return new Promise((resolve,reject)=>{
    Meteor.call('publish-s3data',{s3_url}, (err,data)=>{
      if (err) {resolve({s3_url, error:err}); return;}
      if (!data) {resolve({s3_url, error:'no-data'}); return;}

      resolve({s3_url, error:null});
    })
  })
} // refresh-web-page
