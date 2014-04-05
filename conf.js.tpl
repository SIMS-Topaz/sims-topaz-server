/***************************************************************************
conf:
fichier de conf pour le serveur node.
**************************************************************************/

exports.node =
{
  url  : 'localhost',
  http_port : 8080,
  https_port : 8081,
};

exports.mysql =
{
  url      : 'localhost',
  port     : 3306,
  user     : 'root',
  password : '',
  database : 'topaz',
  multipleStatements: true
};

exports.redis =
{
  url  : 'localhost',
  port : 6379
};

// maximum size of a message preview
exports.PREVIEW_SIZE = 50; // valeur a discuter
