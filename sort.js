const SpotifyWebApi = require("spotify-web-api-node"),
    yargs = require("yargs/yargs"),
    { hideBin } = require("yargs/helpers"),
    express = require("express"),
    request = require("request"),
    cors = require("cors"),
    querystring = require("querystring"),
    cookieParser = require("cookie-parser"),
    crypto = require("crypto"),
    url = require("url"),
    path = require("path");

const argv = yargs(hideBin(process.argv)).argv,
    clientId = argv["clientID"],
    clientSecret = argv["clientSecret"],
    redirectUrl = "http://localhost:8888/callback",
    playlistID = path.parse(url.parse(argv["playlistURL"]).pathname).name,
    mode = argv["mode"] || 'modifyExisted',
    stateKey = "spotify_auth_state",
    app = express()
        .use(express.static(__dirname + "/public"))
        .use(cors())
        .use(cookieParser()),
    spotifyApi = new SpotifyWebApi({
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: redirectUrl,
    });

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

async function matchPlaylist(playlistId, matchTo) {
    await spotifyApi.getPlaylist(playlistId).then(
        async (data) => {
            let currentSongsList = data.body.tracks.items;

            for (let i in matchTo) {
                for (let j in currentSongsList) {
                    if (matchTo[i].track.id == currentSongsList[j].track.id) {
                        await spotifyApi.reorderTracksInPlaylist(playlistId, parseInt(j), parseInt(i) + 1).then(
                            await spotifyApi.getPlaylist(playlistId).then(
                                async (data) => (currentSongsList = data.body.tracks.items),
                                async (err) => console.log(err)
                            ),
                            async (err) => console.log(err)
                        );
                        break;
                    }
                }
            }
        },
        async (err) => console.log(err)
    );
}

async function createNewPlaylist(playlistId, songsList) {
    await spotifyApi.getPlaylist(playlistId).then(
        async (data) => {
            listOfSongsID = createListOfSongsID(songsList);
            await spotifyApi.createPlaylist(data.body.name + " Sorted").then(
                async (data) => {
                    await spotifyApi.addTracksToPlaylist(data.body.id, listOfSongsID).then(
                        (data) => {},
                        (err) => console.log(err)
                    );
                },
                async (err) => console.log(err)
            );
        },
        async (err) => console.log(err)
    );
}

async function sort() {
    await spotifyApi.getPlaylist(playlistID).then(
        async (data) => {
            console.log("Wait...");
            let currentSongsList = data.body.tracks.items;
            let sortedSongsList = sortSongsByArtist(currentSongsList);
            sortedSongsList = sortSongsByAlbumYear(sortedSongsList);
            sortedSongsList = sortSongsByPositionInAlbum(sortedSongsList);
            sortedSongsList = convertArtistsAndAlbumsListToSongsList(sortedSongsList);

            if (mode == "modifyExisted") await matchPlaylist(playlistID, sortedSongsList);
            else if (mode == "createNew") await createNewPlaylist(playlistID, sortedSongsList);
            else console.log("Invalid mode or don't set");

            console.log("Complete");
        },
        (err) => console.log(err)
    );
}

app.get("/login", function (req, res) {
    let state = crypto.randomBytes(16).toString("hex");
    res.cookie(stateKey, state);

    let scope =
        "playlist-modify-private playlist-modify-public playlist-read-private user-library-read user-library-modify";
    res.redirect(
        "https://accounts.spotify.com/authorize?" +
            querystring.stringify({
                response_type: "code",
                client_id: clientId,
                scope: scope,
                redirect_uri: redirectUrl,
                state: state,
            })
    );
});

app.get("/callback", (req, res) => {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect(
            "/#" +
                querystring.stringify({
                    error: "state_mismatch",
                })
        );
    } else {
        res.clearCookie(stateKey);

        let authOptions = {
            url: "https://accounts.spotify.com/api/token",
            form: {
                code: code,
                redirect_uri: redirectUrl,
                grant_type: "authorization_code",
            },
            headers: {
                Authorization: "Basic " + new Buffer.from(clientId + ":" + clientSecret).toString("base64"),
            },
            json: true,
        };

        request.post(authOptions, async (error, response, body) => {
            if (!error && response.statusCode === 200) {
                spotifyApi.setAccessToken(body.access_token);

                res.status(200).send("<p><h1>Token gotten</h1></p><p><h1>Wait for the sorting to finish</h1></p>");

                await sort();
                process.exit();
            } else {
                res.status(498).send("<p><h1>Invalid token</h1></p>");
            }
        });
    }
});

app.listen(8888, () => {
    require("child_process").exec("start http://localhost:8888/login");
});
