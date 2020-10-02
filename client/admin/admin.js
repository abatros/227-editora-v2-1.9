import './admin.html'
import utils from '/shared/utils.js'
import {parse_s3filename} from '/shared/utils.js'
import path from 'path';

const TP = Template.admin;

const sdir = new ReactiveArray();

TP.helpers({
  s3dir() {
    return sdir && sdir.list(); // reactive
  }
})

TP.events({
  'submit form.js-rebuild': (e,tp)=>{
    e.preventDefault();
    console.log({e})
    const target = e.target;
    const s3dir = target.s3dir.value;

    const btn_name = e.originalEvent.submitter.name;
    //const name = e.currentTarget.attributes.name;
    //const iSeq = e.currentTarget.attributes.data.value;

    console.log({btn_name},{s3dir})
    switch(btn_name) {
      case 'rebuild-html':
        rebuild_html(tp,s3dir);
        break;
      case 'publish-index':
        publish_index(tp,s3dir);
      break;
    }
  },
})

// --------------------------------------------------------------------------


async function publish_index(tp, s3dirName) {

  // first : delete from database.
  if (!s3dirName.endsWith('/')) s3dirName += '/';

  Meteor.call('publish-index',s3dirName, (err,data) =>{
    if (err) {
      console.log(`@49 publish-index err:`,err);
      return;
    }

    if (data.error) {
      console.log(`@53 publish-index FAILED <${s3dirName}>:`,data.error)
    } else {
      console.log(`@53 SUCCESS publish-index data for <${s3dirName}>:`,data)      
    }

  })

}

function get_directory_Obsolete(s3prefix) {
  return new Promise((resolve,reject) =>{
    Meteor.call('list-s3objects',s3prefix, (err,data)=>{
      console.log(`@53 `,{err},{data})
      if (err) {resolve({error:err}); return;}
      if (!data) {resolve({error:'no-data'}); return;}
      if (data.error) {resolve({error:data.error}); return;}

      const {Bucket, Key} = parse_s3filename(s3prefix)

      console.log(`@59 publish_index list (${s3prefix}):`,data)

      const list = data.h
          .filter(it => (it.o.md))
          .map(it =>{
            return {xid:it.fname, status:'waiting', cheked:false};
          })


      console.log({list})

      sdir.splice(0,9999) // reactive var
      sdir.push(...list);


      return;


      /************************************************************
      const klength = Key.length;
      const list = data.list.map(it =>{
        if (it.startsWith(Key)) {
          it = it.substring(klength)
          //console.log({subsite},{it})
        }
        return {xid:it, status:'waiting', cheked:false};
      })

      console.log({list})

      sdir.splice(0,9999) // reactive var
      sdir.push(...list);

//      process_all_items(sdir, s3prefix)
      console.log(`get-directory (${list.length})`)
      *******************************************************/
    }) // call.

  })
}

// --------------------------------------------------------------------------

function rebuild_html(tp, s3dir, dry_run=true) {
  console.log(`@83 [${module.id}] rebuild-HTML ${dry_run?"DRY-RUN":""} `,{s3dir})
  // request server the list of
  if (!s3dir.endsWith('/')) s3dir += '/';
  lookup_directory(tp, s3dir, dry_run)
}

function lookup_directory(tp, s3prefix, dry_run) {
//  if (! s3prefix.startsWith('s3://')) s3prefix = 's3://'+s3prefix;

  Meteor.call('list-s3objects',s3prefix, (err,data)=>{
    if (err) throw err;

    if (data.error) {
      throw data.error
    }

    const {Bucket, subsite} = parse_s3filename(s3prefix)


    console.log(`@101 list-objects => data:`,data)

    const list = data.h
        .filter(it => (it.o.md))
        .map(it =>{
          return {xid:it.fname, status:'waiting', cheked:false};
        })


    console.log({list})

    sdir.splice(0,9999) // reactive var
    sdir.push(...list);


    process_all_items(sdir, s3prefix, dry_run)
    console.log('STARTED')
  }) // call.
} // function lookup_directory


async function process_all_items(sdir, s3prefix, dry_run) {
  if (s3prefix.startsWith('s3://')) s3prefix = s3prefix.substring(5);
  const v = sdir.array();

  for (j in v) {
    console.log('-- rebuild ',v[j])
    const x = v
    const retv = await mk1(v,j,s3prefix)
    console.log({retv})
    const status = (retv.error)?retv.error:'Ok.';
    const vj = Object.assign(v[j],{status,checked:true});
    sdir.splice(j, 1, vj)
//    if (j>=20) break;
  }
}

function mk1(v,j,s3prefix, dry_run) {
  const xid = v[j].xid;

//  const s3fn = 's3://' + path.join(s3prefix,xid)
  let s3fn = path.join(s3prefix,xid)+'.md'; // or not publishable.
  console.log({s3fn})
  if (dry_run) return {error:null}

  return new Promise((resolve,reject) =>{
    Meteor.call('publish-s3data', {s3_url:s3fn}, (err,data)=>{
      if (err) {resolve(Object.assign(v[j],{error:err})); return;}
      if (!data) {resolve(Object.assign(v[j],{error:'no-data'}));return;}
      if (data.error) {resolve(Object.assign(v[j],{error:data.error})); return;}
      console.log({data})
      resolve(data)
    })
  })
} // mk1



FlowRouter.route('/admin', { name: 'admin',
  triggerEnter: [
    function(context, redirect) {
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "editora-v2";
    console.log(`@210: host:`,location.host)
    const {host} = location;
    BlazeLayout.render('admin');
  }
});
