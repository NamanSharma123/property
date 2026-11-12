"""Check local HTML links/assets before publishing static websites."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.links.append(value)

errors = []
for name in sys.argv[1:] or ["web"]:
    root = Path(name).resolve()
    for required in ["index.html", "contact.html", "404.html"]:
        if not (root / required).is_file():
            errors.append(f"{root}: missing {required}")
    pages = list(root.glob("*.html"))
    for page in pages:
        parser = Links()
        parser.feed(page.read_text(encoding="utf-8"))
        for link in parser.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            path = unquote(parsed.path)
            target = ((root / path.lstrip("/")) if path.startswith("/") else (page.parent / path)).resolve()
            if not target.is_relative_to(root) or not target.exists():
                errors.append(f"{page}: missing/invalid local target {link}")
    print(f"{name}: checked {len(pages)} HTML pages")
if errors:
    sys.exit("\n".join(errors))
