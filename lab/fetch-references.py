# Download the official 30-second preview of every reference in references.json into the lab's data
# folder, as 44.1 kHz stereo WAV. Analysis only: the audio is copyrighted and never enters Git.
# usage: python fetch-references.py   (needs ffmpeg; then: python sep.py <data>/refs/*/*.wav; python addrefs.py)
import json, os, subprocess, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('BATUQUE_LAB_DATA') or os.path.join(HERE, '.data')
for key, row in json.load(open(os.path.join(HERE, 'references.json'))).items():
    out = os.path.join(DATA, 'refs', key)
    if os.path.exists(out + '.wav'):
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    track = json.load(urllib.request.urlopen(f"https://api.deezer.com/track/{row['deezer']}", timeout=30))
    urllib.request.urlretrieve(track['preview'], out + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out + '.mp3', '-ar', '44100', '-ac', '2', out + '.wav'], check=True)
    os.remove(out + '.mp3')
    print(key, row['track'])
