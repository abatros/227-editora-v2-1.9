const s3 = require('./lib/aws-s3.js')();
import yaml from 'js-yaml';


Meteor.methods({
  'user-profile': async (userId)=>{
    const verbose =1;
    // s3Object outside s3://bueink, s3://abatros
    const retv = await s3.getObject(`s3://publibase/users/${userId}.yaml`)
    ;(verbose >0) && console.log(`@9 get-user-profile `,{retv})

    if (!retv.ETag) {
      return {error: 'file-not-found', userId}
    }

    const user_profile = yaml.safeLoad(retv.data);
    ;(verbose >0) && console.log(`@15 `,{user_profile})

    return user_profile;
  }
})
