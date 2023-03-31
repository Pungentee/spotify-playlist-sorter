require("dotenv").config();

const SpotifyWebApi = require("spotify-web-api-node");
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    redirectUri: process.env.redirectUri,
});

spotifyApi.setAccessToken(process.env.accessToken);

function compareNames(a, b) {
    if (a[0] < b[0]) {
        return -1;
    } else if (a[0] < b[0]) {
        return 1;
    }
    return 0;
}

function compareTracksByAlbumYear(a, b) {
    let aAlbumYear, bAlbumYear;
    aAlbumYear = a.track.album.release_date;
    bAlbumYear = b.track.album.release_date;

    if (aAlbumYear < bAlbumYear) {
        return -1;
    } else if (aAlbumYear < bAlbumYear) {
        return 1;
    }
    return 0;
}

function compareTracksByPositionInAlbum(a, b) {
    let aPosition, bPosition;
    aPosition = a.track.track_number;
    bPosition = b.track.track_number;
    if (aPosition < bPosition) {
        return -1;
    } else if (aPosition < bPosition) {
        return 1;
    }
    return 0;
}

function sortDictByName(dict) {
    sortedDict = {};
    let keys = Object.keys(dict);
    keys.sort(compareNames);
    for (let i in keys) {
        let key = keys[i];
        let value = dict[key];
        sortedDict[key] = value;
    }
    return sortedDict;
}

function sortDictOfSongsByArtistByAlbumYear(songsDict) {
    for (let artist in songsDict) {
        songsDict[artist].sort(compareTracksByAlbumYear);
    }
}

function sortSongsByArtist(songsList) {
    let dictOfSongByArtists = {},
        sortedDictOfSongByArtists = {};

    for (let song of songsList) {
        if (dictOfSongByArtists[song.track.artists[0].name] == undefined) {
            dictOfSongByArtists[song.track.artists[0].name] = [];
        }
        dictOfSongByArtists[song.track.artists[0].name].push(song);
    }
    sortedDictOfSongByArtists = sortDictByName(dictOfSongByArtists);

    return sortedDictOfSongByArtists;
}

function sortDictOfSongsByPositionInAlbum(songsDict) {
    let dictOfAlbums = {};

    for (let artist in songsDict) {
        for (let song in songsDict[artist]) {
            if (
                dictOfAlbums[songsDict[artist][song].track.album.name] ==
                undefined
            ) {
                dictOfAlbums[songsDict[artist][song].track.album.name] = [];
            }
            dictOfAlbums[songsDict[artist][song].track.album.name].push(
                songsDict[artist][song]
            );
        }
    }

    for (let album in dictOfAlbums) {
        dictOfAlbums[album].sort(compareTracksByPositionInAlbum);
    }

    return dictOfAlbums;
}

function converteSongsDictToList(songsDict) {
    let listOfAlbums = [],
        sortedSongList = [];
    for (let album of Object.values(songsDict)) {
        listOfAlbums.push(album);
    }
    for (let album of listOfAlbums) {
        for (let song of album) {
            sortedSongList.push(song);
        }
    }
    return sortedSongList;
}

spotifyApi.getPlaylist(process.env.playlistID).then(
    function (data) {
        let songsList = data.body.tracks.items;
        dictOfSongs = sortSongsByArtist(songsList);
        sortDictOfSongsByArtistByAlbumYear(dictOfSongs);
        dictOfSongs = sortDictOfSongsByPositionInAlbum(dictOfSongs);
        songsList = converteSongsDictToList(dictOfSongs);

        for (let song of songsList) {
            console.log(
                song.track.album.release_date,
                song.track.track_number,
                song.track.name
            );
        }
    },
    function (err) {
        console.log("Something went wrong!", err);
    }
);
