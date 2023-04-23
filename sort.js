#!/usr/bin/env node
import SpotifyWebApi from 'spotify-web-api-node';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import express from 'express';
import crypto from 'crypto';
import url from 'url';
import path from 'path';
import open from 'open';
import { LocalStorage } from 'node-localstorage';

const app = express().get('/callback', (req, res) => {
    spotifyApi.authorizationCodeGrant(req.query.code).then(
        async data => {
            spotifyApi.setAccessToken(data.body['access_token']);
            spotifyApi.setRefreshToken(data.body['refresh_token']);

            localStorage.setItem('accessToken', data.body['access_token']);
            localStorage.setItem('refreshToken', data.body['refresh_token']);

            res.status(200).send('<p><h1>Token gotten</h1></p><p><h1>Wait for the sorting to finish</h1></p>');
            await sort();
            process.exit();
        },
        err => {
            console.log('Something went wrong!', err);
        },
    );
});

const localStorage = new LocalStorage('./config');
const argv = yargs(hideBin(process.argv)).argv;
const scopes = [
    'playlist-modify-private',
    'playlist-modify-public',
    'playlist-read-private',
    'user-library-read',
    'user-library-modify',
];
const state = crypto.randomBytes(16).toString('hex');

let playlistID, clientId, clientSecret, spotifyApi;
if (argv['setID'] || argv['setId']) {
    if (argv['setID'] !== true || argv['setId'] !== true) {
        localStorage.setItem('clientID', argv['setID']);
    } else {
        console.log('plsort --setID <your client ID>');
    }
} else if (argv['setSecret']) {
    if (argv['setSecret'] !== true) {
        localStorage.setItem('clientSecret', argv['setSecret']);
    } else {
        console.log('plsort --setSecret <your client Secret>');
    }
} else if (localStorage.getItem('clientID') === null || localStorage.getItem('clientID') === '') {
    console.log('need to set client ID');
} else if (localStorage.getItem('clientSecret') === null || localStorage.getItem('clientSecret') === '') {
    console.log('need to set client Secret');
} else if (argv['_'].length) {
    playlistID = path.parse(url.parse(argv['_'][0]).pathname).name;
    clientId = localStorage.getItem('clientID') || ['clientID'];
    clientSecret = localStorage.getItem('clientSecret') || argv['clientSecret'];
    spotifyApi = new SpotifyWebApi({
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: 'http://localhost:8888/callback',
    });

    if (
        localStorage.getItem('accessToken') === null ||
        localStorage.getItem('accessToken') === '' ||
        localStorage.getItem('refreshToken') === null ||
        localStorage.getItem('refreshToken') === ''
    ) {
        app.listen(8888, () => {
            open(spotifyApi.createAuthorizeURL(scopes, state));
        });
    } else {
        spotifyApi.setAccessToken(localStorage.getItem('accessToken'));
        spotifyApi.setRefreshToken(localStorage.getItem('refreshToken'));

        await sort();
    }
} else {
    console.log('plsort <link to playlist>');
}

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

async function matchPlaylist(playlistID, matchTo) {
    await spotifyApi.getPlaylist(playlistID).then(
        async data => {
            let currentSongsList = data.body.tracks.items;

            for (let i in matchTo) {
                for (let j in currentSongsList) {
                    if (
                        matchTo[i].track.name == currentSongsList[j].track.name &&
                        matchTo[i].track.artists[0].name == currentSongsList[j].track.artists[0].name
                    ) {
                        await spotifyApi.reorderTracksInPlaylist(playlistID, parseInt(j), parseInt(i) + 1).then(
                            await spotifyApi.getPlaylist(playlistID).then(
                                async data => (currentSongsList = data.body.tracks.items),
                                async err => console.log(err),
                            ),
                            async err => console.log(err),
                        );
                        break;
                    }
                }
            }
        },
        async err => console.log(err),
    );
    await spotifyApi.getPlaylist(playlistID).then(
        async data => {
            let currentSongsList = data.body.tracks.items;
            for (let i in matchTo) {
                if (currentSongsList[i].track.id != matchTo[i].track.id) {
                    await matchPlaylist(playlistID, matchTo);
                }
            }
        },
        err => console.log(err),
    );
}

async function sort() {
    await spotifyApi.getPlaylist(playlistID).then(
        async data => {
            console.log('Wait...');

            let currentSongsList = data.body.tracks.items;
            let sortedSongsList = sortSongsByArtist(currentSongsList);
            sortedSongsList = sortSongsByAlbumYear(sortedSongsList);
            sortedSongsList = sortSongsByPositionInAlbum(sortedSongsList);
            sortedSongsList = convertArtistsAndAlbumsListToSongsList(sortedSongsList);
            await matchPlaylist(playlistID, sortedSongsList);

            console.log('Complete');
        },
        err => {
            if (err.statusCode === 401) {
                spotifyApi.refreshAccessToken().then(
                    async data => {
                        spotifyApi.setAccessToken(data.body['access_token']);
                        spotifyApi.setRefreshToken(data.body['refresh_token']);

                        localStorage.setItem('accessToken', data.body['access_token']);
                        localStorage.setItem('refreshToken', data.body['refresh_token']);

                        await sort();
                        process.exit();
                    },
                    err => {
                        console.log('Could not refresh access token', err);
                    },
                );
            } else console.log(err);
        },
    );
}
