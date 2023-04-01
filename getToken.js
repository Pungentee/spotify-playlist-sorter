require("dotenv").config();

const express = require("express"),
    request = require("request"),
    cors = require("cors"),
    querystring = require("querystring"),
    cookieParser = require("cookie-parser"),
    crypto = require("crypto");

console.log(process.argv);

const clientId = process.env.clientId,
    clientSecret = process.env.clientSecret,
    redirectUri = "http://localhost:8888/callback",
    stateKey = "spotify_auth_state",
    app = express()
        .use(express.static(__dirname + "/public"))
        .use(cors())
        .use(cookieParser());

app.get("/login", function (req, res) {
    let state = crypto.randomBytes(16).toString("hex");
    res.cookie(stateKey, state);

    let scope =
        "user-read-private playlist-modify-private playlist-modify-public playlist-read-private user-library-modify";
    res.redirect(
        "https://accounts.spotify.com/authorize?" +
            querystring.stringify({
                response_type: "code",
                client_id: clientId,
                scope: scope,
                redirect_uri: redirectUri,
                state: state,
            })
    );
});

app.get("/callback", function (req, res) {
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
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            },
            headers: {
                Authorization: "Basic " + new Buffer.from(clientId + ":" + clientSecret).toString("base64"),
            },
            json: true,
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log("Access Token:", body.access_token, "\n\nRefresh Token:", body.refresh_token);

                res.status(200).send(
                    "<p>Access-Token: <b>" +
                        body.access_token +
                        "</b></p><p>Refresh-Token: <b>" +
                        body.refresh_token +
                        "</b></p>"
                );

                process.exit();
            } else {
                res.redirect(
                    "/#" +
                        querystring.stringify({
                            error: "invalid_token",
                        })
                );
            }
        });
    }
});

console.log("Go to: http://localhost:8888/login \n");
app.listen(8888);
