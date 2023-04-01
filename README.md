# Spotify playlist sorter

## Reqires
1. Installed Node.js

2. Create `.env` file by this template:
```d
clientId=" <your cliend_id> "
clientSecret=" <your cliend_secret> "
accessToken=" <your temporary access token> "
playlistID=" <id of playlist that you wanna sort> "
mode=" <mode of saved result> "
```

>>`clientId` and `cleantSecret` of your app you can get on [Spotify Dashboard](https://developer.spotify.com/dashboard)
>>
>>To get `accessToken` use `getToken.js`
>>
>>`playlistID` is id of playlist that you wanna sort
>>
>>`mode` set to `createNew` (create a new playlist with sorted song; can be used with playlists that you don't owned) or `modifyExisted` (reorder existed playlist; can\t be used with playlists that you don't owned)

## Use
```sh
# install dependencies
npm install

# get access token
node getToken.js

# sort playlist
node main.js
```

