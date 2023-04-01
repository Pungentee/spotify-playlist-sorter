require("dotenv").config();

const SpotifyWebApi = require("spotify-web-api-node");
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    redirectUri: "http://localhost:8888/callback",
});

spotifyApi.setAccessToken(process.env.accessToken);

function compareTracksByAlbumYear(a, b) {
    let aAlbumYear, bAlbumYear;
    aAlbumYear = Date.parse(a.track.album.release_date);
    bAlbumYear = Date.parse(b.track.album.release_date);

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

function sortSongsByArtist(songsList) {
    let copySongsList = [...songsList],
        sortedList = [];

    copySongsList.sort((a, b) => a.track.artists[0].name.localeCompare(b.track.artists[0].name));

    for (let song in copySongsList) {
        if (song == 0) {
            sortedList.push([copySongsList[song]]);
        } else if (copySongsList[song].track.artists[0].name == copySongsList[song - 1].track.artists[0].name) {
            sortedList[sortedList.length - 1].push(copySongsList[song]);
        } else {
            sortedList.push([copySongsList[song]]);
        }
    }

    return sortedList;
}

function sortSongsByAlbumYear(songsList) {
    let copySongsList = [...songsList],
        sortedList = [],
        albumList = [];

    for (let artist of copySongsList) {
        sortedList.push(artist.sort(compareTracksByAlbumYear));
    }

    for (let artist in sortedList) {
        if (albumList[artist] == undefined) {
            albumList[artist] = [];
        }
        for (let song in sortedList[artist]) {
            if (song == 0) {
                albumList[artist].push([sortedList[artist][song]]);
            } else if (sortedList[artist][song].track.album.name == sortedList[artist][song - 1].track.album.name) {
                albumList[artist][albumList[artist].length - 1].push(sortedList[artist][song]);
            } else {
                albumList[artist].push([sortedList[artist][song]]);
            }
        }
    }

    return albumList;
}

function sortSongsByPositionInAlbum(songsList) {
    let copySongsList = [...songsList],
        sortedList = [];

    for (let artist in copySongsList) {
        if (sortedList[artist] == undefined) {
            sortedList[artist] = [];
        }
        for (let album in copySongsList[artist]) {
            if (sortedList[artist][album] == undefined) {
                sortedList[artist][album] = [];
            }
            sortedList[artist][album] = copySongsList[artist][album].sort(compareTracksByPositionInAlbum);
        }
    }

    return sortedList;
}

function convertArtistsAndAlbumsListToSongsList(artistAndAlbumList) {
    let copySongsList = [...artistAndAlbumList],
        songsList = [];

    for (let artist of copySongsList) {
        for (let album of artist) {
            for (let song of album) {
                songsList.push(song);
            }
        }
    }

    return songsList;
}

function createListOfSongsID(songsList) {
    let songsIDList = [];
    for (let song of songsList) {
        songsIDList.push("spotify:track:" + song.track.id);
    }
    return songsIDList;
}

spotifyApi.getPlaylist(process.env.playlistID).then(
    async (data) => {
        console.log("Wait...");
        let currentSongsList = data.body.tracks.items;
        let sortedSongsList = sortSongsByArtist(currentSongsList);
        sortedSongsList = sortSongsByAlbumYear(sortedSongsList);
        sortedSongsList = sortSongsByPositionInAlbum(sortedSongsList);
        sortedSongsList = convertArtistsAndAlbumsListToSongsList(sortedSongsList);

        if (process.env.mode == "modifyExisted") {
            for (let i in sortedSongsList) {
                for (let j in currentSongsList) {
                    if (sortedSongsList[i].track.id == currentSongsList[j].track.id) {
                        await spotifyApi
                            .reorderTracksInPlaylist(process.env.playlistID, parseInt(j), parseInt(i) + 1)
                            .then(
                                await spotifyApi.getPlaylist(process.env.playlistID).then(
                                    (data) => (currentSongsList = data.body.tracks.items),
                                    (err) => console.log(err)
                                ),
                                (err) => console.log(err)
                            );
                        break;
                    }
                }
            }
        } else if (process.env.mode == "createNew") {
            listOfSongsID = createListOfSongsID(sortedSongsList);
            spotifyApi.createPlaylist(data.body.name + " Sorted").then(
                (data) => {
                    spotifyApi.addTracksToPlaylist(data.body.id, listOfSongsID).then(
                        (data) => {},
                        (err) => console.log(err)
                    );
                },
                (err) => console.log(err)
            );
        } else {
            console.log("Invalid mode or don't seted");
        }
        console.log("Complete");
    },
    (err) => console.log(err)
);
