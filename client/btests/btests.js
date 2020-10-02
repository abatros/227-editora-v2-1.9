import './btests.html'
const assert = require('assert')
const path = require('path')
const {parse_s3filename} = require('/shared/utils.js')
import yaml from 'js-yaml'

const TP = Template.btests

TP.onRendered(async function() {
  const tp = this;
  const pre = tp.find('pre');

  tp.print = function (...s) {
//    pre.insertAdjacentHTML('afterend', s);
    const v =[];
    s.forEach(it =>{
      if (typeof s != 'string') {
        v.push(yaml.dump(it));
      } else {
        v.push(it)
      }
    })
    pre.insertAdjacentHTML('beforeend', v.join(''));
  }


  try {
    test_parse_s3_filename(tp, {
      s3fn: 's3://blueink/ya14/1202-Y3k2/index.md',
      Bucket: 'blueink',
      Key: 'ya14/1202-Y3k2/index.md',
      subsite: 'ya14',
      xid: '1202-Y3k2',
      base: 'index.md',
      ext: '.md'
    });
    test_parse_s3_filename(tp, {
      s3fn: 'blueink/ya14/1202-Y3k2/index.md',
      Bucket: 'blueink',
      Key: 'ya14/1202-Y3k2/index.md',
      subsite: 'ya14',
      xid: '1202-Y3k2',
      base: 'index.md',
      ext: '.md'
    });
    test_parse_s3_filename(tp, {
      s3fn: 's3://blueink/ya14/1202-Y3k2/index.html',
      Bucket: 'blueink',
      Key: 'ya14/1202-Y3k2/index.html',
      subsite: 'ya14',
      xid: '1202-Y3k2',
      base: 'index.html',
      ext: '.html'
    });
    test_parse_s3_filename(tp, {
      s3fn: 'blueink/ya14/1202-Y3k2/index.html',
      Bucket: 'blueink',
      Key: 'ya14/1202-Y3k2/index.html',
      subsite: 'ya14',
      xid: '1202-Y3k2',
      base: 'index.html',
      ext: '.html'
    });
    test_parse_s3_filename(tp, {
      s3fn: 'blueink/ya14/1202-Y3k2',
      Bucket: 'blueink',
      Key: 'ya14/1202-Y3k2',
      subsite: null,
      xid: null,
      base: '1202-Y3k2',
      ext: ''
    });
    test_parse_s3_filename(tp, {
      s3fn: 'blueink/ya14/1202-Y3k2/',
      Bucket: 'blueink',
      Key: 'ya14/1202-Y3k2/',
      subsite: null,
      xid: null,
      base: '1202-Y3k2',
      ext: ''
    });
    test_parse_s3_filename(tp, {
      s3fn: 'blueink/ya14',
      Bucket: 'blueink',
      Key: 'ya14',
      subsite: null,
      xid: null,
      base: 'ya14',
      ext: ''
    });
    test_parse_s3_filename(tp, {
      s3fn: 'blueink/ya14/',
      Bucket: 'blueink',
      Key: 'ya14/',
      subsite: null,
      xid: null,
      base: 'ya14',
      ext: ''
    });

    await s3_batch1(tp)
  }
  catch(err) {
    console.log(`failed`,{err})
//    print(JSON.stringify(err))
    tp.print(yaml.dump(err))
  }
})// onRendered

// ---------------------------------------------------------------------------


function test_parse_s3_filename(tp,o) {
  const {s3fn, Bucket, Key, subsite, xid, base, ext} = o;
    const {s3fn:s3fn_, Bucket:Bucket_, Key:Key_, subsite:subsite_,
      xid:xid_, base:base_, ext:ext_ } = parse_s3filename(s3fn);
    if (Bucket != Bucket_) throw Object.assign(o,{ERROR:'Bucket'})
    if (Key != Key_) throw Object.assign(o,{ERROR:'Key'})
    if (subsite != subsite_) throw Object.assign(o,{ERROR:`subsite "${subsite_}"`})
    if (xid != xid_) throw Object.assign(o,{ERROR:'xid'})
    if (base != base_) throw Object.assign(o,{ERROR:'base'})
    if (ext != ext_) throw Object.assign(o,{ERROR:'ext'})
    tp.print(`passed &lt;${o.s3fn}&gt;`)
}


// ---------------------------------------------------------------------------

async function s3_deleteObject(s3fn) {
  console.log(`@107 `,{s3fn})
  if (s3fn.endsWith('/')) {
    const retv = await s3_readdir(s3fn);
    console.log(`@110 objects to delete: `,{retv})
    console.log(`@111 objects to delete --list ${retv.list.length}`, retv.list)
    const listk = retv.list.map(it => it.Key)
    console.log(`@112 objects to delete --list ${listk.length}`, listk.join('|'))
    //return s3_deleteObjects(s3fn)
  }
  return new Promise((resolve,reject) =>{
    Meteor.call('delete-s3object',s3fn, (err,data)=>{
      console.log(`@109 `,{err},{data})
      if (err) throw err;
      resolve(data)
    })
  })
}




function s3_readdir(s3fn) {
  console.log(`@118 `,{s3fn})
  return new Promise((resolve,reject) =>{
    Meteor.call('subsite-directory',s3fn, (err,data)=>{
      console.log(`@121 `,{err},{data})
      if (err) throw err;
      resolve(data)
    })
  })
}

function s3_putObject(s3_url, data_) {
  console.log(`@129 putObject `,{s3_url})
  return new Promise((resolve,reject) =>{
    Meteor.call('put-s3object',{s3_url, data:data_}, (err,data)=>{
      console.log(`@132 `,{err},{data})
      if (err) throw err;
      resolve(data)
    })
  })
}

function promise_Call(name, p1) {
  return new Promise((resolve,reject) =>{
    Meteor.call(name, p1, (err,data)=>{
      if (err) throw err;
      resolve(data)
    })
  })
}


async function s3_batch1(tp) {
  tp.print(`Entering batch1...`)
  const retv1 = await s3_deleteObject('s3://publibase/btests/')
  console.log(`@117 `,{retv1})
  tp.print(`@121 deleteObject('s3://publibase/btests/')`); // should delete directory.
  tp.print(retv1)

  const retv2 = await s3_readdir('s3://publibase/btests/')
  tp.print(retv2);
  console.log(`@161 `,{retv2})
  assert(retv2.prefix == 'btests','@147')
//  assert(retv2.list.length ==0, tp.print('failed @163'))
//  assert(retv2.error == null,  tp.print('failed @164'))
//  tp.print(`passed readdir@140`);

  const retv3 = await s3_putObject('s3://publibase/btests/hello.txt','Helllo Dolly')
  console.log(`@153 `,{retv3})

  const retv4 = await s3_readdir('s3://publibase/btests/')
  console.log(`@156 `,{retv4})

  const retv5a = await promise_Call('put-s3object',{
    s3_url:'s3://publibase/btests/hello2.txt',
    data: 'Helllo Dolly2'
  })
  console.log(`@186 `,{retv5a})
  tp.print('@186', retv5a);

  const retv5 = await promise_Call('subsite-directory','s3://publibase/btests/')
  tp.print('@187', retv5);


  const retv6 = await promise_Call('subsite-directory','s3://abatros/projects')
  tp.print('@198', retv6);

  const retv7 = await promise_Call('list-s3objects',{
    Bucket:'abatros',
    Prefix:'projects',
    Delimiter: 'index.md'
  });
  tp.print('@201 subsite-directory', retv7);

  const retv8 = await promise_Call('list-md-files',{
    Bucket:'abatros',
    Prefix:'projects',
  });
  console.log({retv8})
  tp.print(`\n@229 list-md-file (${retv8.length})`, retv8);



}

// ---------------------------------------------------------------------------

FlowRouter.route('/btests', { name: 'edit-article',
  triggerEnter: [
    function(context, redirect) {
      const web_page = Session.get('web-page');
      console.log(`triggerEnter web_page:`,Session.get('web-page'))
//      if (!web_page) redirect('/')
    }
  ],
  action: function(params, queryParams){
    document.title = "editora-v2-btests";
    BlazeLayout.render('btests');
  }
})
