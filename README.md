sims-topaz-server
=================

La partie Server du projet SIMS.

###Node.js

Aller sur la page du projet et le télécharger (gros bouton vert INSTALL): http://nodejs.org
Le navigateur téléchargera la version adaptée à l'OS (Linux, Windows, Mac OS, 32 ou 64 bits...)

#### Installation

##### Windows

Exécuter le fichier node-vX.X.X.msi.
Tester avec la commande node dans un terminal.

##### Mac OS

Exécuter le fichier node-vX.X.X.pkg.
Tester avec la commande node dans un terminal.

##### Linux

Extraire l'archive, lancer un shell et se placer dans le répertoire node-vX.X.X:
```
cd node-vX.X.X
sudo apt-get install g++ curl libssl-dev apache2-utils git-core
./configure
make
sudo make install
```

Ou alors, en passant par le gestionnaire de paquet:
```
sudo apt-get install python-software-properties python g++ make
sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install nodejs
```

### Base de données

SQL vs NoSQL, à débattre...
