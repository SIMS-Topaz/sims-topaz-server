var _ = require('underscore');

var messages = [
  {
    lat: 45.783028,
    long: 4.881148,
    text: 'INSA !',
    id: 1,
    is_full: true,
    timestamp: 1391591648
  },
  {
    lat: 45.782167,
    long: 4.872093,
    text: 'Bâtiment IF',
    id: 2,
    is_full: true,
    timestamp: 1391591750
  },
  {
    lat: 45.783753,
    long: 4.872651,
    text: 'Bâtiment TC',
    id: 3,
    is_full: true,
    timestamp: 1391591750
  },
];
 
exports.get_previews = function(lat, long){
  if(lat === undefined || long === undefined){
    return null;
  }else{
    return messages;
   }
}

exports.get_message = function(id){
  if(id !== undefined){
    var msg = _.where(messages, {id: parseInt(id)});
    return msg.length !== 0 ? msg:null;
  }
  else{
    return null;
  }
}

exports.post_message = function(body){
  body['id'] = messages.length+1;
  body['timestamp'] = Math.floor(new Date().getTime()/1000);
  messages.push(body);
  return body;
}
