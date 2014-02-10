/***************************************************************************
conf:
fichier de conf pour le serveur node.
**************************************************************************/

exports.node =
{
  url  : 'localhost',
  port : 8080
};

exports.mysql =
{
  url      : 'localhost',
  port     : 3306,
  user     : 'root',
  password : 'root',
  database : 'topaz'
};

// date format used in MySQL
exports.MYSQL_DATE = 'YYYY-MM-DD HH:mm:ss';

// maximum size of a message preview
exports.PREVIEW_SIZE = 20; // valeur a discuter
