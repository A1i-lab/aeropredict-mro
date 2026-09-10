"""Download the exact archive linked by NASA PCoE, then extract only FD001."""
import io,zipfile,urllib.request,hashlib,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from src.config import ROOT
URL='https://phm-datasets.s3.amazonaws.com/NASA/6.+Turbofan+Engine+Degradation+Simulation+Data+Set.zip'
def main():
    b=urllib.request.urlopen(URL,timeout=120).read()
    outer=zipfile.ZipFile(io.BytesIO(b))
    z=zipfile.ZipFile(io.BytesIO(outer.read(next(n for n in outer.namelist() if n.endswith('CMAPSSData.zip')))))
    raw=ROOT/'data/raw'; raw.mkdir(parents=True,exist_ok=True)
    for n in z.namelist():
        if 'FD001' in n or n=='readme.txt': (raw/Path(n).name).write_bytes(z.read(n))
    (raw/'provenance.json').write_text(json.dumps({'url':URL,'archive_sha256':hashlib.sha256(b).hexdigest()},indent=2))
if __name__=='__main__': main()
