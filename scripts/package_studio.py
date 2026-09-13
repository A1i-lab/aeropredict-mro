"""Package the application code for Streamlit; aircraft stays in static/models."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
def package():
    dist=ROOT/'frontend/dist'
    html=(dist/'index.html').read_text()
    def script(m):
        source=(dist/m.group(1).removeprefix('./').removeprefix('/')).read_text()
        return '<script type="module">'+source.replace('</script','<\\/script')+'</script>'
    html=re.sub(r'<script[^>]*src="([^"]+)"[^>]*></script>',script,html)
    def style(m):
        return '<style>'+(dist/m.group(1).removeprefix('./').removeprefix('/')).read_text()+'</style>'
    html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>',style,html)
    html=re.sub(r'<link[^>]*rel="icon"[^>]*>', '',html)
    target=ROOT/'frontend/studio.html'
    target.write_text(html)
    print(target, target.stat().st_size)
    return target
if __name__=='__main__':package()
