module.exports = {
  servers: {
    one: {
      // TODO: set host address, username, and authentication method
      host: 'ultimheat.com',
      username: 'dkz',
      // or neither for authenticate from ssh-agent
    }
  },



  app: {
    // TODO: change app name and path
    name: 'editora-v2',
    path: '/home/dkz/2020/227-editora-v2',

    volumes: {
       // passed as '-v /host/path:/container/path' to the docker run command
       // '/home/dkz/dico-chauffage-2017': '/www/dico-chauffage-2017'
       //'/home/dkz/224-ultimheat.co.th/':'/home/dkz/2019/224-ultimheat.co.th/tmp/'
        '/www':'/www' // to give access to registry
//       '/home/dkz/tmp/224-co.th-dkz':'/www/editora-registry/localhost'
     },

    servers: {
      one: {},
    },

    buildOptions: {
      serverOnly: true,
    },

    env: {
      // TODO: Change to your app's url
      // If you are using ssl, it needs to start with https://
	    PORT: 32046,
      ROOT_URL: 'http://45.44.5.114/editora',
    },

    // ssl: { // (optional)
    //   // Enables let's encrypt (optional)
    //   autogenerate: {
    //     email: 'email.address@domain.com',
    //     // comma separated list of domains
    //     domains: 'website.com,www.website.com'
    //   }
    // },

    docker: {
      // change to 'kadirahq/meteord' if your app is using Meteor 1.3 or older
      image: 'abernix/meteord:node-12.16.1-base',
    },

    // Show progress bar while uploading bundle to server
    // You might need to disable it on CI servers
    enableUploadProgressBar: true
  },

};
