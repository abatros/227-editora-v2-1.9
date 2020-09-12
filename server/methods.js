const s3 = require('./lib/aws-s3.js')();
import yaml from 'js-yaml';


Meteor.methods({
  'get-user-config': async (userId)=>{
    // s3Object outside s3://bueink, s3://abatros
    const retv = await s3.getObject(`s3://publibase/users/${userId}.yaml`)
      console.log(`@9 `,{retv})
    if (!retv.ETag) {
      return {error:null, userId, user_config:null}
    }

    const user_config = yaml.safeLoad(retv.Body.toString('utf8'))
    //console.log(user_config)
    return {error:null, userId, user_config}
  }
})
