import argparse
from localStoragePy import localStoragePy
import spotipy
from spotipy.oauth2 import SpotifyOAuth

parser = argparse.ArgumentParser()
parser.add_argument("link", type=str)
parser.add_argument("--clientID", type=str)
parser.add_argument("--clientSecret", type=str)
args = parser.parse_args()

localStorage = localStoragePy('auth')

clientID = args.clientID
if clientID == None:
    clientID = localStorage.getItem('clientID')
    if clientID == None:
        clientID = input("Input your client ID: ")
        localStorage.setItem("clientID", clientID)
elif clientID != None:
    localStorage.setItem("clientID", clientID)

clientSecret = args.clientSecret
if clientSecret == None:
    clientSecret = localStorage.getItem('clientSecret')
    if clientSecret == None:
        clientSecret = input("Input your client Secret: ")
        localStorage.setItem("clientSecret", clientSecret)
elif clientSecret != None:
    localStorage.setItem("clientSecret", clientSecret)

spotify = spotipy.Spotify(
    client_credentials_manager=SpotifyOAuth(client_id=clientID, client_secret=clientSecret, redirect_uri="http://example.com", scope="playlist-modify-private playlist-modify-public playlist-read-private user-library-read user-library-modify"))

playlist_id = "spotify:playlist:" + args.link[34:56]

track_in_playlist = spotify.playlist_items(
    playlist_id, fields='total')["total"]

list_of_tracks_unsorted = spotify.playlist_items(
    playlist_id, fields='items.track.artists,items.track.id,items.track.album.release_date,items.track.track_number')["items"]

if track_in_playlist > 100:
    for i in range(int(track_in_playlist / 100) + 1):
        if i == 0:
            continue
        else:
            other_tracks = spotify.playlist_items(
                playlist_id, offset=i * 100, fields='items.track.artists,items.track.id,items.track.album.release_date,items.track.track_number')["items"]
            for track in other_tracks:
                list_of_tracks_unsorted.append(track)

list_of_tracks = []
list_of_artist = []
list_of_albums = []
list_of_tracks_sorted = []

for track in list_of_tracks_unsorted:
    # pprint(track)
    track["track"]["artist_name"] = track["track"]["artists"][0]["name"]
    track["track"]["release_date"] = track["track"]["album"]["release_date"]
    del track["track"]["artists"]
    del track["track"]["album"]

for artist in range(len(list_of_tracks_unsorted)):
    list_of_tracks_unsorted[artist] = list_of_tracks_unsorted[artist]["track"]
    list_of_tracks.append(list_of_tracks_unsorted[artist])


def take_artist(elem):
    return elem["artist_name"][0].lower()


def take_year(elem):
    return elem["release_date"]


def take_track_number(elem):
    return elem["track_number"]


def find_track(list, track):
    for track2 in range(len(list)):
        if track["id"] == list[track2]["id"]:
            return track2


for track in list_of_tracks:
    if track["artist_name"][:3] == "the" or track["artist_name"][:3] == "The":
        track["artist_name"] = track["artist_name"][4:]

list_of_tracks.sort(key=take_artist)


for artist in range(len(list_of_tracks)):
    if artist == 0:
        list_of_artist.append([list_of_tracks[artist]])
    elif list_of_tracks[artist]["artist_name"] == list_of_tracks[artist-1]["artist_name"]:
        list_of_artist[-1].append(list_of_tracks[artist])
    elif list_of_tracks[artist]["artist_name"] != list_of_tracks[artist-1]["artist_name"]:
        list_of_artist.append([list_of_tracks[artist]])


for artist in list_of_artist:
    artist.sort(key=take_year)

for artist in range(len(list_of_artist)):
    list_of_albums.append([])
    for track in range(len(list_of_artist[artist])):
        if track == 0:
            list_of_albums[artist].append([list_of_artist[artist][track]])
        elif list_of_artist[artist][track]["release_date"] == list_of_artist[artist][track-1]["release_date"]:
            list_of_albums[artist][-1].append(list_of_artist[artist][track])
        elif list_of_artist[artist][track]["release_date"] != list_of_artist[artist][track-1]["release_date"]:
            list_of_albums[artist].append([list_of_artist[artist][track]])

for artist in list_of_albums:
    for album in artist:
        album.sort(key=take_track_number)

for artist in list_of_albums:
    for album in artist:
        for track in album:
            list_of_tracks_sorted.append(track)


for track in range(len(list_of_tracks_sorted)):
    spotify.playlist_reorder_items(playlist_id, find_track(
        list_of_tracks_unsorted, list_of_tracks_sorted[track]), track)

    list_of_tracks_unsorted.insert(track, list_of_tracks_unsorted.pop(find_track(
        list_of_tracks_unsorted, list_of_tracks_sorted[track])))
