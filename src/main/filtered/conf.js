/***************************************************************************
conf:
fichier de conf pour le serveur node.
**************************************************************************/

// ENVIRONNEMENT: ${env}

// NODE
var node =
{
	url  : '${node.url}',
	port : ${node.port}
};

/*=========================== EXPORTS ===========================*/
exports.node = node;
