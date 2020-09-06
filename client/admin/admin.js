import './admin.html'

const TP = Template.admin;

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
