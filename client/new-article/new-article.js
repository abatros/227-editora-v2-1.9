FlowRouter.route('/new', { name: 'new-article',
  triggerEnter: [
    function(context, redirect) {
//      const web_page = Session.get('web-page');
//      console.log(`triggerEnter web_page:`,Session.get('web-page'))
//      if (!web_page) redirect('/')
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "editora-v2";
    console.log(`@13 new-article host:`,location.host)
    const {host} = location;
    const {s3} = queryParams;
    console.log(`@13 new-article s3:`,s3)

    const s3fpath = 's3://'+s3
    Meteor.call('new-article',s3fpath,(err, data)=>{
      if (err) {
        throw err;
      }
      // here the article was created

      console.log(`@24 `,{data})
      Session.set('s3fpath', s3fpath)
      BlazeLayout.render('edit_article');
    }) // call
  } // action
});
