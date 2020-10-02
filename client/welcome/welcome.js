import './welcome.html'
import sha1 from 'sha1';
import assert from 'assert'

const TP = Template.welcome;

TP.onCreated(function() {
  const tp = this;
  tp.data.err_message = new ReactiveVar();
  document.title = 'Editora-Welcome'
})



TP.events({
  'submit': (e,tp) =>{
    e.preventDefault()
  },
  'submit .js-userId': (e,tp)=>{
    e.preventDefault()
    const userId = e.target.userId.value;
    console.log({userId})
    tp.userId = userId;

    const hashes = JSON.parse(localStorage.getItem('user-hash')) || [];

    function find_user(userId) {
      for (h of hashes) {
        if (sha1(userId) == h) {
          //Session.set('userId',userId);
          return userId;
          break;
        }
      }
    }

    if (!find_user(userId)) {
      tp.data.err_message.set('Invalid userId<br>contact your admin.')
      return;
    }

    localStorage.setItem('userId',userId); // user logged-in.


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
      const next = Session.get('requested-target');
      if (next) {
        console.log({next})
        FlowRouter.go('/'+next)
      }
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
   const re_route = `/edit?s3=${ws}`;
   console.log(`@86 re-route to <${re_route}>`)
   // attention we loose the tailing '/' if any.
   FlowRouter.go(re_route);
 },
 'click .js-sign-up': (e,tp) =>{
   const ws = e.target.attributes.name.value;
   console.log({ws})
   Session.set('mode-sign-up',true)
//   FlowRouter.go(`/edit?s3=${ws}`)
},
 'submit .js-userCode': async (e,tp) =>{
   const oneTimeCode = e.target.userCode.value;
   console.log({oneTimeCode})
//   Session.set('mode-sign-up',false) // ??? for what
//   FlowRouter.go(`/edit?s3=${ws}`)
   const retv = await sign_Up(tp, {userId:tp.userId, oneTimeCode})
   console.log(`@91 `,{retv})
 }
}) // events


async function sign_Up(tp, params) {
  console.log({params})
  return new Promise((resolve,reject) =>{
    Meteor.call('sign-up',params,(err,data) =>{
      if (err) {
        tp.data.err_message.set(err)
        return;
      }
      if (data.error) {
        tp.data.err_message.set('ALERT : ' + data.error)
      }

      /***************************************
        (1) if temp user-yaml object found, add hash to localStorage
      ****************************************/

      console.log(`@103 `,data);
      // here we get the user.yaml
      const user = data && data.data;
      assert(user.userId);
      const hashes = JSON.parse(localStorage.getItem('user-hash'));
      const s = new Set(hashes);
      s.add(sha1(user.userId))

      localStorage.setItem('user-hash',JSON.stringify(Array.from(s)));

      /***************************************
        (2) set yaml in session
      ****************************************/

      Session.set('userId',user.userId);
      Session.set('user-profile', data.data);

      /***************************************
        (3) session.workspaces
      ****************************************/

      const subsites = []
      if (Array.isArray(data.data.subsites)) subsites.push(...data.data.subsites)
      else subsites.push(data.data.subsites)
      Session.set('workspaces',subsites);

      /***************************************
        (4) for what ?
      ****************************************/

      const u_pro = {}
      for (let j=0; j<localStorage.length; j++) {
        const key = localStorage.key(j);
        switch(key) {
          case 'user-hash': continue;
        }
        u_pro[key] = localStorage.getItem(key)
      }

      console.log({u_pro})
      console.log(`userId:`,Session.get('userId'))
      console.log(`user-profile:`,Session.get('user-profile'))

    })
  })
} // Sign-up


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

    FlowRouter.go('/welcome')
return;

    const eKey = localStorage.getItem('editoraKey')
    if (eKey && (sha1(eKey) == '1dc680272516fcad239e0464dea45c61b8097ace')) {
      Session.set('editoraKey','3.14')
    }
    BlazeLayout.render('welcome');
  }
});


FlowRouter.route('/zero', {name:'editora-zero',
  action: function(params, queryParams){
    localStorage.clear();
    FlowRouter.go('welcome')
//    BlazeLayout.render('welcome');
  }
})

FlowRouter.route('/logout', {name:'editora-logout',
  action: function(params, queryParams){
    localStorage.setItem('userId',null);
    FlowRouter.go('welcome')
//    BlazeLayout.render('welcome');
  }
})
