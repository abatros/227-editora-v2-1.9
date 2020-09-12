/*
    All functions using nspell:
    correct and suggest
*/

const nspell = require('nspell');
const fr_dico = require('dictionary-fr');
const en_dico = require('dictionary-en');
const de_dico = require('dictionary-de');


function init_nspell(dictionary) {
  if (!dictionary) {
    throw "Missing dictionary name"
  }

  return new Promise((resolve)=>{
    require(dictionary)((err,dict)=>{
      if (err) {
        reject(err)
        return;
      }

      const spell = nspell(dict)
      resolve(spell);
    })
  }); // promise
}


// ---------------------------------------------------------------------------

var vdico;

Meteor.startup(async function(){
  const fr = new Promise((resolve,rejct)=>{
    fr_dico((err,dict)=>{
      if (err) {reject(err); return;}
      resolve(nspell(dict))
    })
  })
  const en = new Promise((resolve,rejct)=>{
    en_dico((err,dict)=>{
      if (err) {reject(err); return;}
      resolve(nspell(dict))
    })
  })
  const de = new Promise((resolve,rejct)=>{
    de_dico((err,dict)=>{
      if (err) {reject(err); return;}
      resolve(nspell(dict))
    })
  })

  Promise.all([fr,en,de])
  .then(v =>{
    vdico = v;
    console.log('Suggestions is initialized.');
  })

})

// ---------------------------------------------------------------------------

function mk_suggestions1(query) {
//  console.log(`suggestions(${query})=>`);
  query = query.replace(/"/g,'')
  const s = query.replace(/\(\)\|\&/g,' ').replace(/\s+/g,' ')
    .split(' ')
    .map(w => {
      w = w.trim();
      if (w.length > 2)
        w =vdico[0].suggest(w).filter(it=>(it.length == w.length)).concat([w]).join('|')
      return `(${w})`;
    })
    .join('<->')
//    console.log('suggestion=>',s);
  return s;
}

// ---------------------------------------------------------------------------

function mk_suggestions2(query) {
//  console.log(`suggestions(${query})=>`);
  query = query.replace(/"/g,'')
  const s = query.replace(/\(\)\|\&/g,' ').replace(/\s+/g,' ')
    .split(' ')
    .map(w => {
      w = w.trim();
      if (w.length > 2)
      w =vdico[0].suggest(w).concat([w]).join('|')
      return `(${w})`;
    })
    .join('<->')
//    console.log('suggestion=>',s);
  return s;
}

// ---------------------------------------------------------------------------

function mk_all_suggestions(wlist) {
//  console.log(`suggestions(${query})=>`);
  if (!Array.isArray(wlist)) {
    throw "mk_all_suggestions must operate on array or words."
  }
  return wlist
    .map(w => {
      w = w.trim();
      if (w.length > 2)
        w =vdico[0].suggest(w).concat([w]).join('|')
      return `(${w})`;
    })
}


// ---------------------------------------------------------------------------

module.exports = {
  mk_suggestions1,
  mk_suggestions2,
  mk_all_suggestions,
  vdico: ()=>{return vdico;}
}
