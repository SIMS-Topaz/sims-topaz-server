sims-topaz-server
=================

La partie Server du projet SIMS.

###Bonnes pratiques

####Commit

Quand un membre de l'équipe fait un commit, il serait intéressant que le nom du commit commence les initiales du membre faisant le commit entre crochets.
Exemple: pour John Doe: [JDO]
La description du commit doit décrire très clairement ce qui a été commité.


####Branches

Eviter de coder directement sur la branche master. Créer une nouvelle branche (avec un nom pertinant) pour développer une nouvelle fonctionnalité, ou corriger une anomalie. Effectuer des tests avant de merger dans la branche master.


###Technologies utilisées

####Node.js

Aller sur la page du projet et le télécharger (gros bouton vert INSTALL): http://nodejs.org
Le navigateur téléchargera la version adaptée à l'OS (Linux, Windows, Mac OS, 32 ou 64 bits...)

#####Installation

######Windows

Exécuter le fichier node-vX.X.X.msi.
Tester avec la commande node dans un terminal.

######Mac OS

Exécuter le fichier node-vX.X.X.pkg.
Tester avec la commande node dans un terminal.

######Linux

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

####Base de données

SQL vs NoSQL, à débattre...
