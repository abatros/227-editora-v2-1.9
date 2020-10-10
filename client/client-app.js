import assert from 'assert'
import utils from '/shared/utils.js'
import {s3fix} from '/shared/utils.js'
const path = require('path')
const yaml = require('js-yaml')
const {parse_s3filename, extract_metadata} = require('/shared/utils.js')

// ---------------------------------------------------------------------------
/*
      Current document must stay in the cache.
*/

//const codeMirror_Value = new ReactiveVar();

const verbose =0;



_editora_debug_session = true;

function alert(msg) {
  console.warn(`ALERT [${module.id}] =>`,msg)
  throw msg
// audit.  tp.data.err_message.set(msg)
}



Tracker.autorun(function(){ // this should be in the banner
  const verbose =1;
  const userId = Session.get('userId')

  console.log(`@30>>>>>>>>>>>>>>`, Session.userId && Session.userId.curValue)

  ;(verbose >0) && console.log(`@29 [${module.id}] autorun <${userId}>`)

  if (!userId) {
    Session.set('user-profile', userId)
    return;
  }


  const tp =null; //// to fix

  console.log(`>>> AUTORUN (userId): <${userId}>`)

  Meteor.call('user-profile', userId, (err, user_profile) =>{
    if (err) {alert('sys-'+err); return;}
    if (!user_profile) {alert('no-data'); return;}
    if (user_profile.error) {alert(user_profile.error); return;}

    console.log({user_profile})

    tp && tp.data.err_message.set('welcome back...')
    let {subsites} = user_profile;
    subsites = subsites && subsites.split('\n').filter(it=>{return (it.trim() != '')})
    console.log(`@32 `,{subsites});
    if (!subsites) {
      tp && tp.data.err_message.set('Insuficient privileges.<br>Please ask your admin to allow subsite access')
      return;
    }

    user_profile.subsites = subsites;

//    Session.set('workspaces', subsites);

    ;(verbose >=0) && console.log(`@58 user-profile:=`,user_profile)
    Session.set('user-profile', user_profile);
    Session.set('search-path', user_profile.path);


    /************************************************************

    once user-profile is found,
    add this user to the list of authorized users in localStorage
    and set this.user the logged-in user.

    *************************************************************/

    localStorage.setItem('userId',userId) // currently logged-in user
    const next = Session.get('requested-target');
//    assert (!next) // never defined here.





    /**************************************************************

    this is executed in triggerEnter.
    Before any route
    or when user changed.

    ***************************************************************/



    console.log(`@57 original request : <${next}>`)
    if (next) {
      console.log(`@58 continuing with original request : <${next}>`)
      FlowRouter.go('/'+next)
    }
  }) // Meteor.call
}) // autorun (userId) => user-profile


// ---------------------------------------------------------------------------


// -------------------------------------------------------------------------




// -------------------------------------------------------------------------
