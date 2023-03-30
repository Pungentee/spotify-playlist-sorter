require("dotenv").config();

const SpotifyWebApi = require("spotify-web-api-node");
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    redirectUri: process.env.redirectUri,
});

spotifyApi.setAccessToken(process.env.accessToken);

function sortArtists(listOfSongs) {}

spotifyApi.getPlaylist(process.env.playlistID).then(
    function (data) {
        let songsOfPlaylistList = data.body.tracks.items;
    },
    function (err) {
        console.log("Something went wrong!", err);
    }
);
