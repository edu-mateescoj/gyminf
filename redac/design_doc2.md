Définition
Un document de conception est un rapport technique qui décrit la stratégie de mise en œuvre d’un système dans le contexte des compromis et des contraintes.

Objectif
Considérez un document de conception comme une preuve en mathématiques. Le but d’une preuve est de convaincre le lecteur que le théorème est vrai. L’objectif d’un document de conception est de convaincre le lecteur que la conception est optimale compte tenu de la situation.

La personne la plus importante à convaincre est l'auteur. Le fait de rédiger un document de conception contribue à ajouter de la rigueur à des intuitions par ailleurs vagues. L’écriture révèle à quel point votre réflexion était bâclée (et plus tard, le code montrera à quel point votre écriture était bâclée).

Organisation
Une bonne organisation des documents de conception est aussi importante que l’organisation du code. Vous avez probablement des opinions sur l’organisation du code. Vous avez probablement utilisé l’expression « code spaghetti » pour décrire un code mal organisé. La plupart des programmeurs écrivent des « documents de conception spaghetti » à moins d’avoir beaucoup de pratique.

Permettez-moi d’illustrer un problème courant d’organisation du code auquel certains programmeurs sont confrontés dès leur premier jour. Le novice écrit

terminal.print("Hello world")
Ensuite, ils décident qu'ils veulent rendre le texte rouge, alors ils modifient leur programme pour

terminal.print("Hello world")
terminal.setPrintColor("red")
Et puis ils sont confus parce que ce n'est pas sorti rouge. Ils n'ont pas internalisé cette première ligne de code se produit avant le deuxième. Ils obtiennent simplement une soupe de code sur l’écran qui contient en quelque sorte les ingrédients d’un programme et s’attendent à ce que l’ordinateur fasse ce qu’ils veulent.

Les rédacteurs de documents novices font le exact même erreur, mais avec de la prose au lieu du code. Ils reçoivent une soupe de phrases et de paragraphes et s’attendent à ce que le cerveau du lecteur fasse ce qu’il veut.

Si le lecteur est suffisamment intelligent, vous pourriez vous en sortir. Tout comme un programmeur expert peut démêler mentalement le code spaghetti.

Mais un document parfait est écrit de telle sorte que le lecteur n'est jamais surpris. Le lecteur devrait constater que chaque phrase découle évidemment des précédentes. Ils devraient terminer votre document et penser « eh bien, c'était tout à fait simple, pourquoi avions-nous même besoin d'avoir cette réunion ? ».

Cela déçoit le comportement de recherche d’ego de nombreux ingénieurs. Les bons ingénieurs veulent souvent que les gens réalisent à quel point ils étaient intelligents.

Mais un bon document exposera le problème et les modèles mentaux de manière à ce que la solution qui a pris des semaines de réflexion difficile à inventer soit claire pour le lecteur au moment où le document la présentera.

Cela nécessite également d’avoir un bon modèle de l’esprit des personnes qui lisent votre document. L’objectif de votre document est de faire passer leur esprit de son état actuel à un nouvel état dans lequel ils pensent que votre conception est bonne.

Vous devez anticiper toutes les objections que quelqu'un pourrait avoir et montrer de manière préventive pourquoi elles ne sont pas valides, afin que le lecteur ne pense même jamais à les soulever.

De nombreux ingénieurs ne parviennent pas à modéliser l’état de départ de l’esprit de leurs lecteurs et ne parviennent donc pas à les amener à l’état de destination.

Édition
Une fois que vous avez organisé et présenté correctement les informations, l’étape suivante consiste à les modifier en fonction de leur longueur. Supprimez chaque mot qui peut être supprimé. Faites cela parce que l’attention de vos lecteurs est une ressource rare.

À moins que vous ne soyez un écrivain inhabituellement concis, vous pouvez presque toujours réduire la longueur de ~30 % par rapport à la première ébauche sans sacrifier les informations.

Le moyen le plus simple de devenir bon en édition en passant par autre documents des gens avec un stylo rouge et en barrant les mots inutiles. Vous en trouverez des tonnes. Il est plus facile de critiquer les autres.

Une fois que vous avez développé ce muscle, vous pouvez retourner l’arme contre vous-même. Distiller des pensées pour les adapter à la limite de 280 caractères des tweets est également une pratique étonnamment bonne.

Volume
Rien ne remplace beaucoup de pratique. Je suis reconnaissant d’avoir travaillé chez AWS avec une culture de rédaction de documents unique. Les premiers documents que j'y ai écrits étaient terribles, mais après quelques centaines, j'aime penser qu'ils étaient plutôt bons.

Pour les lecteurs inconnus : les réunions Amazon commencent avec le présentateur distribuant des copies (historiquement physiques, mais de plus en plus numériques depuis Covid) d'un document en prose. Le document fait 1 à 6 pages selon son importance.

La réunion commence avec tout le monde assis en silence, lisant le document et ajoutant des notes et des questions dans les marges avec un stylo rouge. Regarder les gens baliser le document que vous avez passé tant de temps à peaufiner est une fort forcer la fonction à devenir un meilleur écrivain.

Conseils concrets
Ceux-ci fonctionnent pour moi, mais ils ne fonctionneront peut-être pas pour vous.

Utiliser des paragraphes courts
Vous devriez considérer votre document comme une série de puces qui s’enchaînent les unes aux autres. Autrement dit, un document pourrait être organisé comme suit :

Observation A
Observation B
Parce que B, idée C
Mais les problèmes D et E
Observation F
Par conséquent l'idée G
Et amélioration H
Chacun de ces points devrait être un paragraphe qui peut être résumé en une seule phrase. Ce n'est pas nécessaire be une seule phrase — que vous pouvez développer si nécessaire. Mais, une fois lu, le lecteur devrait être capable de le compresser en une seule phrase dans son esprit.

Ceci est lié à l’idée d’édition et au fait que l’attention de votre lecteur est une ressource rare. Votre lecteur dispose d’une quantité limitée de choses qu’il peut jongler avec la mémoire à court terme. Écrire dans ce style « une idée par paragraphe » permet au lecteur de compresser le paragraphe et ainsi de consommer moins de cette ressource rare.

Utiliser une annexe
S'il y a un nombre dans le document qui est le résultat d'un calcul ou d'une simulation complexe, ne l'incluez pas dans le corps du document. Utilisez une note de bas de page comme :

Une simulation de Monte-Carlo[1] a montré que la probabilité de perte de données due à la corruption est inférieure à 1 sur 10^12

Décrivez ensuite la simulation plus en détail en annexe. L’annexe ne doit pas être nécessaire à lire pour comprendre la conclusion principale du document. Il est uniquement là pour que le lecteur curieux puisse vérifier votre travail s'il le souhaite.

Exemple d'édition travaillé
Voici un paragraphe ci-dessus avant de le modifier :

Chacun de ces points doit être son propre paragraphe dans votre document. Et chaque paragraphe doit être résumable en une seule phrase. Le paragraphe n'a pas besoin de le faire en fait be une seule phrase. Par exemple, vous pouvez inclure quelques phrases supplémentaires pour vraiment illustrer l’ensemble du concept que vous essayez de transmettre. Mais, une fois que le lecteur l’a lu, il devrait être capable de le compresser en une seule phrase dans son esprit.

Et voici la version éditée qui transmet exactement les mêmes informations, mais plus petites :

Chacun de ces points devrait être un paragraphe qui peut être résumé en une seule phrase. Ce n'est pas nécessaire be une seule phrase — que vous pouvez développer si nécessaire. Mais, une fois lu, le lecteur devrait être capable de le compresser en une seule phrase dans son esprit.