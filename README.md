# Chat WebSocket

Auteur: Alexandre CAROL

## Fonctionnalités

- **Authentification JWT** : Connexion avec des utilisateurs prédéfinis (admin/user)
- **Gestion des rooms** :
  - Rooms par défaut : Lobby, Informations, Recrutement, Support (réservée aux admins)
  - Création de nouvelles rooms (admins uniquement)
  - Suppression de rooms (admins uniquement)
  - Rejoindre/quitter des rooms
  - Cooldown des messages
- **Messagerie en temps réel** : Envoi et réception de messages instantanés
- **Indicateur de frappe** : Voir quand un utilisateur est en train d'écrire

## Installation

1. Clonez le repository :
   ```bash
   git clone https://github.com/Zastial/ESGI5IW-WEB-TEMPS-REEL-Websocket-chat.git
   cd ESGI5IW-WEB-TEMPS-REEL-Websocket-chat
   ```

2. Configurez les variables d'environnement :
   - Copiez le fichier `app/.env.example` vers `app/.env`
   - Modifiez les valeurs dans `app/.env`

3. Lancez le projet :
   ```bash
   docker-compose up
   ```

4. Accédez à `http://localhost:3000` ou `http://localhost:3000/front/index.html`

## Utilisation

1. Connectez-vous avec un des comptes :
   - **Admin** : username `admin`, password défini dans `.env`
   - **User** : username `user`, password défini dans `.env`

2. Rejoignez une room en cliquant dessus dans la liste

3. Envoyez des messages dans le chat

4. (Admin) Créez ou supprimez des rooms via les boutons dédiés
