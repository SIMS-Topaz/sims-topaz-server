sims-topaz-server
=================

La partie Server du projet SIMS.

###Bonnes pratiques

####Branches

Eviter de coder directement sur la branche master.
Créer une nouvelle branche pour développer une nouvelle fonctionnalité, ou corriger une anomalie.
Le nom de la branche doit commencer par le nom de la personne qui crée cette branche.
Ex: pour John Doe, jdo/branch_name
Effectuer des tests avant de faire une pull request.


###Technologies utilisées

####Node.js

Aller sur la page du projet et le télécharger (gros bouton vert INSTALL): http://nodejs.org
Le navigateur téléchargera la version adaptée à l'OS (Linux, Windows, Mac OS, 32 ou 64 bits...)

#####Installation

######Windows

Exécuter le fichier node-vX.X.X.msi.
Tester avec la commande node dans un terminal.

######Mac OS / Linux

Le plus simple est de passer par nvm: nvm permet d'avoir plusieurs versions de node.js installées sur votre machine, tout est installé en local donc ça ne pollue pas votre OS (même avec -g):
```
git clone https://github.com/creationix/nvm
cd nvm
source nvm.sh
nvm install 0.10.24
nvm use 0.10.24
nvm alias default 0.10.24
```

Quand vous voulez utiliser node.js:
```
cd nvm
source nvm.sh
which node
--> devrait afficher /home/user/nvm/v0.10.22/bin/node et non /usr/local/bin/node
```

####Base de données

MySQL. (Basculer sur du MongoDB?)
redis pour les sessions utilisateurs.
