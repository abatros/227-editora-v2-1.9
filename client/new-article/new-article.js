FlowRouter.route('/new', { name: 'new-article',
  triggerEnter: [
    function(context, redirect) {
      const web_page = Session.get('web-page');
      console.log(`triggerEnter web_page:`,Session.get('web-page'))
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

    Meteor.call('new-article',s3,(err, data)=>{
      if (err) {
        throw err;
      }
      // here the article was created

      console.log(`@24 `,{data})
      if (data.s3fpath.startsWith('s3://')) data.s3fpath = data.s3fpath.substring(5);
      console.log(`@26 `,data.s3fpath)
      Session.set('s3fpath', data.s3fpath)
      BlazeLayout.render('edit_article');
    }) // call
  } // action
});
