import './articles-directory.html'

const TP = Template['articles-directory'];

let etime;
var e3list = new ReactiveArray();

TP.onCreated(function(){
  const tp = this;
  etime = new Date().getTime();
  console.log(`[${new Date().getTime()-etime}] Template[articles-directory].onCreated.data:`,tp.data)
})


TP.onRendered(function(){
  const tp = this;
  console.log(`[${new Date().getTime()-etime}] Template[articles-directory].onRendered.data:`,tp.data)
  const url = Session.get('edit-url')
  const ai = Session.get('edit-ai')
  if (!url) throw new Meteor.Error('NO URL')
  Meteor.call('e3list',{url},(err,retv)=>{
    if (err) throw new Meteor.Error('fatal')
    console.log(retv)
    e3list.splice(0,9999)
    e3list.push(...retv);

//    const e3list = tp.find("#e3list")
//    console.log({e3list})
  })
})

TP.helpers({
  url: ()=>{
    return Session.get('edit-url')
  },
  e3list: function() {
    const tp = Template.instance();
    console.log(`e3list-helper:`,e3list)
    return e3list && e3list.list();
  }
})


FlowRouter.route('/articles-directory', { name: 'articles-directory',
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "editora-v2";
    BlazeLayout.render('articles-directory',Object.assign(params,queryParams));
  }
});
