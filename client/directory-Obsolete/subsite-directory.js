import './subsite-directory.html'
import {s3parser} from '/shared/utils.js';
import assert from 'assert'
const TP = Template['subsite-directory'];

let etime;
var alist = new ReactiveArray();

TP.onCreated(function(){
  const tp = this;
  etime = new Date().getTime();
  console.log(`[${new Date().getTime()-etime}] Template[articles-directory].onCreated.data:`,tp.data)
})


TP.onRendered(function(){
  const tp = this;
  console.log(`[${new Date().getTime()-etime}] Template[articles-directory].onRendered.data:`,tp.data)

  const s3dir = tp.data.s3dir();
  assert(s3dir);

  Meteor.call('subsite-directory', s3dir, (err,retv)=>{
    if (err) throw new Meteor.Error('fatal')
    if (retv.error) throw new Meteor.Error('fatal2')
    console.log(retv)

    alist.splice(0,9999)
    alist.push(...retv.data);

  })
})

TP.helpers({
  url: ()=>{
    return Session.get('edit-url')
  },
  alist: function() {
    const tp = Template.instance();
    console.log(`alist-helper:`,alist)
    return alist && alist.list();
  }
})


FlowRouter.route('/subsite-directory', { name: 'subsite-directory',
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "editora-v2";

    let {s3} = queryParams;
    if (!s3) {
      throw 'fatal@53'
    }

    s3dir = 's3://' + new s3parser(s3).remove('index.md').value;
    Session.set('s3dir',s3dir)
//    BlazeLayout.render('edit_article', {xid:queryParams.xid, host});
    BlazeLayout.render('subsite-directory', {s3dir});
  }
});
