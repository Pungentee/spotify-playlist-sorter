# Spotify playlist sorter

## Reqires
1. Installed **Node.js**
2. Spotify App

## Use
```shell
# install dependencies
npm install

# sort playlist
node sort.js --clientID <your clientID> \
             --clientSecret <your clientSecret> \
             --playlistURL <link to playlist that you want to sort> \
             --mode <mode of saving sorted playlist>
```

**clientId** and **clientSecret** of your app. You can get it created app on [Spotify Dashboard](https://developer.spotify.com/dashboard) (for redirect URL use <http://localhost:8888/callback>)

`mode` can be setted to **createNew** or **modifyExisted** (default setted to **modifyExisted**):

> **createNew** (create a new playlist with sorted playlist; can be used with playlists that you don't own; don't add local files)
>
> **modifyExisted** (reorder existed playlist; can't be used with playlists that you don't own; work's with local files)
