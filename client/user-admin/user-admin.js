import './user-admin.html'

const TP=Template['user-admin'];



FlowRouter.route('/user-admin', { name: 'user-admin',
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

    Session.set('user-admin-com','working...')

    const txt = [];
    Object.keys(queryParams).forEach(key =>{
      const x = write_local(key, queryParams[key])
      txt.push(x)
    })

    localStorage.setItem('user-profile', 'admin');
    const u_profile = localStorage.getItem('user-profile');
console.log(u_profile)

    console.log(`password:`, localStorage.getItem('password'))
    console.log(`allowed-buckets:`, localStorage.getItem('allowed-buckets'))
    txt.push(`you have access to:\n    `+localStorage.getItem('allowed-buckets'));

    Session.set('user-admin-com',txt.join('\n'))
    BlazeLayout.render('user-admin');
  }
});


function write_local(key,value) {
  const txt =[];
  if (Array.isArray(value)) {
    txt.push(`${key} =>(${value.length}) [${value.join(', ')}]`)
  }
  else {
    txt.push(`${key} => [${value}]`)
  }
  switch(key) {
    case 'allow': allow(key,value); break;
    case 'password': setpass(value); break;
    default:
      txt.push(`Invalid key <${key}> =>[${value}]`)
  }
  return txt;
}


function allow(key,value) {
  localStorage.setItem('allowed-buckets', value);
}

function setpass(value) {
  localStorage.setItem('password', value);
}
