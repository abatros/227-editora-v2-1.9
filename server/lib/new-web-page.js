const s3 = require('./aws-s3.js')(process.env); // for s3-Keys
const yaml = require('js-yaml');
const path = require('path')


async function new_web_page(argv) {

  const {verbose, yes, dryRun, force,
    output, limit,
    in_folder // source
  } =  argv;

  ;(verbose >1) && console.log(`@15 `,{argv})

  ;(verbose >0) && console.log(`> -------------------
    check for existing folder `)

  const {Bucket, Key} = parse_s3filename(in_folder);

  const s3cfg = `s3://${Bucket}/${path.join(Key,'.publish.yaml')}`;
  const s3md = `s3://${Bucket}/${path.join(Key,'master.md')}`;
  const s3html = `s3://${Bucket}/${path.join(Key,'master.html')}`;

  const retv1 = await s3.getObjectMetadata(s3cfg);
  const retv2 = await s3.getObjectMetadata(s3md);
  const retv3 = await s3.getObjectMetadata(s3html); // template


  // -ff force and replace

  if (retv1.ETag || retv2.ETag || retv3.ETag) {
    if (!force) {
      console.log(`@29 folder <${in_folder}> not empty - use (-f) --force`,{retv1},{retv2},{retv3})
      return;
    }
  }

  if (true || !retv1.ETag) {
    const cfg_yaml = yaml.dump({
      format: 'undefined',
      xid: '101',
      template: 'master.html'
    });

    const p3 = {
      Bucket,
      Key: path.join(Key,'.publish.yaml'),
      Body: cfg_yaml,
      ACL: 'public-read',
      ContentType: 'text/x-yaml',
      ContentEncoding : 'utf8',
    };

    const retv3 = await s3.putObject(p3);
    ;(verbose >0) && console.log({retv3})
    console.log(`see file at http://ultimheat.co.th/${path.join(Key,'.publish.yaml')}`)
  }

  if (true || !retv2.ETag) {
    const md_data = `---
xid: 101
title: a-nice-title
---
# myHeadline
`

    const p3 = {
      Bucket,
      Key: path.join(Key,'master.md'),
      Body: md_data,
      ACL: 'public-read',
      ContentType: 'text/x-markdown',
      ContentEncoding : 'utf8',
    };

    const retv3 = await s3.putObject(p3);
    ;(verbose >0) && console.log({retv3})
    console.log(`see file at http://ultimheat.co.th/${path.join(Key,'master.md')}`)
  }


  if (true || !retv3.ETag) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <title> New Page </title>
</head>

<!--
    TEMPLATE
-->

<body>
<h1>New Page</h1>
{{{html}}}
</body>
</html>
`

    const p3 = {
      Bucket,
      Key: path.join(Key,'master.html'),
      Body: html,
      ACL: 'public-read',
      ContentType: 'text/html',
      ContentEncoding : 'utf8',
    };

    const retv3 = await s3.putObject(p3);
    ;(verbose >0) && console.log({retv3})
    console.log(`see file at http://ultimheat.co.th/${path.join(Key,'master.html')}`)
  }



}

module.exports = {
  new_web_page
}

// -----------------------------------------------------------------

async function exists_web_page(s3path) {
  const retv1 = await s3.getObjectMetadata(s3path);
  if (!retv1.error && retv1.error.code == 'NotFound') {
    return null;
  }

  if (retv1.error) throw retv1.error;

  const {Bucket, Key} = parse_s3filename(s3path);
  if (Key.endsWith('.publish.yaml')) {
    return s3path;
  }

  const Key2 = path.join(Key,'.publish.yaml')
  s3path = `s3://${Bucket}/${Key2}`;
//  const retv2 = await s3.getObjectMetadata({Bucket,Key:Key2});
  const retv2 = await s3.getObjectMetadata(s3fpath);

  if (!retv2.error && retv2.error.code == 'NotFound') {
    return null;
  }
  if (retv2.error) throw retv2.error;

  return s3path;
}
