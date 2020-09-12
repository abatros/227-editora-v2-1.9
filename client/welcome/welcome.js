import './welcome.html'
import sha1 from 'sha1';

const TP = Template.welcome;

TP.onCreated(function() {
  const tp = this;
  tp.data.err_message = new ReactiveVar();
})

TP.events({
  'submit': (e,tp) =>{
    e.preventDefault()
  },
  'submit .js-userId': (e,tp)=>{
    e.preventDefault()
    const userId = e.target.userId.value;
    console.log({userId})
    Meteor.call('get-user-config', userId, (err,data) =>{
      if (err) {alert(tp, 'sys-'+err); return;}
      if (!data) {alert(tp, 'no-data'); return;}
      if (data.error) {alert(tp, data.error); return;}

      console.log({data})
      if (!data.user_config) {
        tp.data.err_message.set('user not found.')
        return;
      }
      tp.data.err_message.set('welcome back...')
      let {subsites} = data.user_config;
      subsites = subsites && subsites.split('\n').filter(it=>{return (it.trim() != '')})
      console.log(`@32 `,{subsites});
      if (!subsites) {
        tp.data.err_message.set('Insuficient privileges.<br>Please ask your admin to allow subsite access')
        return;
      }
      Session.set('userId',userId);
      Session.set('workspaces', subsites);
    })
  },
  'input': (e,tp) =>{
    console.log(`@29 e.key:`,e.key)
    tp.data.err_message.set();
  },
  'keyup': (e,tp)=>{
    ///console.log(`@8 keyCode: (${e.keyCode})`)
    if (e.key == 'Enter') { // (e.keyCode == 13)
     console.log(`Do something with (${e.target.value})`);
   } else {
   }
 },
 'click .js-select-workspace': (e,tp) =>{
   const ws = e.target.attributes.name.value;
   console.log({ws})
   FlowRouter.go(`/edit?workspace=${ws}`)
 }
})


function alert(tp, msg) {
  console.log({msg})
  tp.data.err_message.set(msg)
}


FlowRouter.route('/welcome', { name: 'welcome',
  triggerEnter: [
    function(context, redirect) {
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "user-admin";
    const {host} = location;
    console.log(queryParams)

    BlazeLayout.render('welcome');
  }
});


FlowRouter.route('/', { name: 'editora',
  triggerEnter: [
    function(context, redirect) {
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "user-admin";
    const {host} = location;
    console.log({queryParams})

    const eKey = localStorage.getItem('editoraKey')
    if (eKey && (sha1(eKey) == '1dc680272516fcad239e0464dea45c61b8097ace')) {
      Session.set('editoraKey','3.14')
    }
    BlazeLayout.render('welcome');
  }
});
