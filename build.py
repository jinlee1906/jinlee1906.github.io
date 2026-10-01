#!/usr/bin/env python3
"""Generates the site's static HTML pages from partials/ and content/.

Run `python3 build.py` after editing anything in content/ or partials/,
or after changing PAGES below. Output files are written to the repo root
with the same filenames the site has always used, so nothing else about
hosting or linking changes.
"""
import datetime
import hashlib
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
PARTIALS = ROOT / "partials"
CONTENT = ROOT / "content"
SITE_URL = "https://jinlee1906.github.io/"
SOCIAL_IMAGE = SITE_URL + "images/og-card.png"


def asset(name):
    """Local CSS/JS URL with a content fingerprint, so a deploy never pairs new HTML with a cached old file."""
    return f"{name}?v={hashlib.sha1((ROOT / name).read_bytes()).hexdigest()[:8]}"

PAGES = [
    {"file": "index.html", "title": "Jin Lee | Chemical Engineering Portfolio",
     "description": "Jin Lee — chemical engineering student. Projects in battery design, soft robotics, CAD, and perfumery.",
     "sidebar": "home", "hex_count": 9, "ornaments": True},
    {"file": "perfume.html", "title": "Perfumery",
     "description": "Perfume design and formulation notes by Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "brandstorm.html", "title": "L'Oréal Brandstorm",
     "description": "L'Oréal Brandstorm wearable perfume watch concept by Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "venturiflowmeter.html", "title": "Venturi Flow Meter: 06-261",
     "description": "Venturi flow meter CAD and COMSOL simulation project by Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "bananas.html", "title": "Bananas Bananas Bananas!",
     "description": "AAS and titration experiments measuring potassium concentration in bananas.",
     "sidebar": "project", "hex_count": 6},
    {"file": "oc.html", "title": "CMU Orientation Counselor",
     "description": "CMU Orientation Counselor experience — Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "ssa.html", "title": "CMU SSA - Singapore Students Association",
     "description": "CMU Singapore Students Association — Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "tcl.html", "title": "Tartan Cultural League",
     "description": "Tartan Cultural League — Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "rocket-command.html", "title": "Carnegie Mellon Rocket Command",
     "description": "Carnegie Mellon Rocket Command — Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "solar-racing.html", "title": "Carnegie Mellon Solar Racing",
     "description": "Carnegie Mellon Solar Racing — Jin Lee.",
     "sidebar": "project", "hex_count": 6},
]

SIDEBARS = {
    "home": (PARTIALS / "sidebar-home.html").read_text(),
    "project": (PARTIALS / "sidebar-project.html").read_text(),
}


# Line-art background motifs (strokes only, no fill), each in a 0-0-100-100
# viewBox so they drop into any .hex-N sized box. Skeletal-formula molecules
# are interleaved with simplified process flow diagram (PFD) symbols so every
# page, even one showing only the first 6, gets a mix of both.
MOTIFS = [
    # molecule: zigzag alkane chain (hexane-like)
    '<polyline points="10,68 29,40 48,68 67,40 86,68"/>',
    # PFD: distillation column with feed, overhead condenser, reflux drum,
    # reflux return, product draw, and bottoms
    '<rect x="38" y="20" width="16" height="66" rx="8"/>'
    '<path d="M14 50 H38"/><polyline points="33,46 38,50 33,54"/>'
    '<path d="M46 20 V10 H66"/><circle cx="72" cy="10" r="6"/>'
    '<path d="M72 16 V34"/><rect x="62" y="34" width="20" height="10" rx="5"/>'
    '<path d="M72 44 V56 H54"/><polyline points="59,52 54,56 59,60"/>'
    '<path d="M82 39 H94"/><polyline points="89,35 94,39 89,43"/>'
    '<path d="M46 86 V94 H70"/><polyline points="65,90 70,94 65,98"/>',
    # molecule: plain ring (cyclohexane)
    '<polygon points="85,50 67.5,19.7 32.5,19.7 15,50 32.5,80.3 67.5,80.3"/>',
    # PFD: feed tank draining to a centrifugal pump
    '<path d="M26 4 V18"/><polyline points="22,13 26,18 30,13"/>'
    '<rect x="14" y="18" width="24" height="46" rx="10"/>'
    '<path d="M26 64 V78 H44"/><circle cx="54" cy="78" r="10"/>'
    '<path d="M54 68 H72 V30 H90"/><polyline points="85,26 90,30 85,34"/>',
    # molecule: triple bond chain (hexyne-like)
    '<line x1="10" y1="76" x2="28" y2="50"/>'
    '<line x1="28" y1="46" x2="72" y2="46"/>'
    '<line x1="28" y1="50" x2="72" y2="50"/>'
    '<line x1="28" y1="54" x2="72" y2="54"/>'
    '<line x1="72" y1="50" x2="90" y2="76"/>',
    # PFD: heat exchanger (tube stream zigzag, shell stream top to bottom)
    '<circle cx="50" cy="50" r="18"/>'
    '<polyline points="8,50 38,50 43,41 50,59 57,41 62,50 92,50"/><polyline points="87,46 92,50 87,54"/>'
    '<path d="M50 8 V32"/><polyline points="46,27 50,32 54,27"/>'
    '<path d="M50 68 V92"/><polyline points="46,87 50,92 54,87"/>',
    # molecule: branched chain with a methyl branch
    '<polyline points="12,78 30,52 48,78 66,52 84,78"/><line x1="30" y1="52" x2="19" y2="26"/>',
    # PFD: stirred tank reactor (motor, shaft, impeller, feed in, product out)
    '<rect x="43" y="6" width="14" height="8" rx="2"/>'
    '<rect x="26" y="26" width="48" height="56" rx="10"/>'
    '<path d="M50 14 V64"/><path d="M40 64 H60"/>'
    '<path d="M8 36 H26"/><polyline points="21,32 26,36 21,40"/>'
    '<path d="M74 72 H92"/><polyline points="87,68 92,72 87,76"/>',
    # molecule: ring with one double bond (cyclohexene)
    '<polygon points="85,50 67.5,19.7 32.5,19.7 15,50 32.5,80.3 67.5,80.3"/>'
    '<line x1="78" y1="52" x2="63.5" y2="26.5"/>',
]


# Projects and clubs shown as full chapters on the homepage, in order. Each chapter is the
# same content/<file> that builds the standalone page, minus its "Back to ..." link.
PROJECT_CHAPTERS = ["perfume.html", "brandstorm.html", "venturiflowmeter.html", "bananas.html"]
CLUB_CHAPTERS = ["oc.html", "ssa.html", "tcl.html", "rocket-command.html", "solar-racing.html"]


def story_chapters(files, section, label, prefix):
    """The first chapter carries #<section> so nav links land on it; data-nav keeps the
    sidebar link for <section> highlighted on every chapter of the run."""
    chapters = []
    total = len(files)
    for n, file in enumerate(files, 1):
        body = (CONTENT / file).read_text()
        body = re.sub(r'\s*<p><a class="back-link"[^\n]*</p>', "", body)
        anchor = section if n == 1 else prefix + file.removesuffix(".html")
        flipped = " is-flipped" if n % 2 == 0 else ""
        # keep any extra classes the page declares (e.g. club-page)
        body = re.sub(
            r'<section class="panel project-page([^"]*)">',
            lambda m: f'<section id="{anchor}" class="panel project-page{m.group(1)} project-chapter{flipped}" data-nav="{section}">\n'
                      f'        <p class="chapter-kicker">{label} {n:02d} / {total:02d}</p>',
            body,
            count=1,
        )
        chapters.append(body.rstrip())
    return "\n\n".join(chapters)


def hex_background(count):
    hexes = []
    for i in range(1, count + 1):
        motif = MOTIFS[(i - 1) % len(MOTIFS)]
        hexes.append(
            f'      <div class="hex hex-{i}"><svg viewBox="0 0 100 100" class="bond-svg">{motif}</svg></div>'
        )
    return '    <div class="hex-background" aria-hidden="true">\n' + "\n".join(hexes) + '\n    </div>\n'


# Icon + label show the *current* theme; CSS picks which pair is visible.
# Top-right controls. Each pill shows its *current* state; CSS picks which icon/label is visible.
VIEW_CONTROLS = """  <div class="view-controls">
    <button class="view-toggle layout-toggle" type="button">
      <svg class="icon-story" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9"/></svg>
      <svg class="icon-sidebar" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
      <span class="view-label layout-label layout-label-story">Story view<span class="sr-only">, switch to sidebar view</span></span>
      <span class="view-label layout-label layout-label-sidebar">Sidebar view<span class="sr-only">, switch to story view</span></span>
    </button>
    <button class="view-toggle theme-toggle" type="button">
      <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      <span class="view-label theme-label theme-label-dark">Dark mode<span class="sr-only">, switch to light mode</span></span>
      <span class="view-label theme-label theme-label-light">Light mode<span class="sr-only">, switch to dark mode</span></span>
    </button>
  </div>
"""

PAGE_ORNAMENTS = """    <div class="page-ornaments" aria-hidden="true">
      <span class="glow-ring ring-1"></span>
      <span class="glow-ring ring-2"></span>
    </div>
"""


SITE_FOOTER = f"""    <footer class="site-footer">
      <span>&copy; {datetime.date.today().year} Jin Lee</span>
      <span class="footer-links">
        <a href="mailto:jinlee2@andrew.cmu.edu">Email</a>
        <a href="https://www.linkedin.com/in/wenjinlee/" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://github.com/jin1906" target="_blank" rel="noopener">GitHub</a>
        <a href="files/Jin_Lee_Resume.pdf" target="_blank" rel="noopener">Resume</a>
      </span>
    </footer>
"""


LOADER = (PARTIALS / "loader.html").read_text()
# homepage only: show the loading screen on the first visit of a browser session, and hold
# the welcome page back (hero-wait) until its entrance plays
LOADER_HEAD_SCRIPT = (
    "<script>(function(d){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;"
    "d.classList.add('hero-wait');if(!sessionStorage.getItem('loaded')){d.classList.add('is-loading');"
    "sessionStorage.setItem('loaded','1')}}catch(e){}})(document.documentElement)</script>\n  "
)

# Microsoft Clarity (heatmaps and session recordings), on every page; skipped on local
# previews so testing the site never shows up in the stats
CLARITY_ID = "yqzxaziqtt"
CLARITY = (
    '<script>(function(c,l,a,r,i,t,y){if(/^(localhost|127\\.0\\.0\\.1|)$/.test(l.location.hostname))return;'
    'c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};'
    't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;'
    'y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);'
    '})(window,document,"clarity","script","' + CLARITY_ID + '")</script>\n  '
)


def fingerprint_videos(markup):
    """Version local video and poster URLs like the CSS/JS, so a replaced video is never
    served from a browser's stale cache (a new file under the same name kept playing the old one)."""
    markup = re.sub(r'((?:data-src|src)=")(images/[^"?]+\.mp4)(")',
                    lambda m: m.group(1) + asset(m.group(2)) + m.group(3), markup)
    return re.sub(r'(poster=")(images/[^"?]+)(")',
                  lambda m: m.group(1) + asset(m.group(2)) + m.group(3), markup)


def build_page(page):
    content = (CONTENT / page["file"]).read_text()
    content = content.replace(
        "      <!-- @project-chapters -->",
        story_chapters(PROJECT_CHAPTERS, "projects", "Project", "project-"),
    ).replace(
        "      <!-- @club-chapters -->",
        story_chapters(CLUB_CHAPTERS, "extracurriculars", "Extracurricular", "club-"),
    )
    sidebar = SIDEBARS[page["sidebar"]]
    ornaments = PAGE_ORNAMENTS if page.get("ornaments") else ""
    is_home = page["file"] == "index.html"
    title = html.escape(page["title"] if is_home else f'{page["title"]} | Jin Lee')
    description = html.escape(page["description"])
    url = SITE_URL if is_home else SITE_URL + page["file"]
    loader_css = f'<link rel="stylesheet" href="{asset("loader.css")}">' if is_home else ""
    content = fingerprint_videos(content)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="author" content="Jin Lee">
  <meta name="theme-color" content="#0a0a0a">
  <link rel="canonical" href="{url}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="images/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Jin Lee">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SOCIAL_IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <script>(function(d){{d.dataset.layout='story';try{{if(localStorage.getItem('theme')==='light')d.dataset.theme='light';if(localStorage.getItem('layout')==='sidebar')d.dataset.layout='sidebar'}}catch(e){{}}}})(document.documentElement)</script>
  {LOADER_HEAD_SCRIPT if is_home else ""}{CLARITY}<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap">
  <link rel="stylesheet" href="{asset('style.css')}">
  <link rel="stylesheet" href="{asset('hexagons.css')}">
  {loader_css}
  <script src="{asset('script.js')}" defer></script>
  <script src="{asset('story.js')}" defer></script>
</head>
<body>
{LOADER if is_home else ""}{VIEW_CONTROLS}  <div class="layout">
{hex_background(page["hex_count"])}
{ornaments}{sidebar}
    <main class="content">
{content}{SITE_FOOTER}    </main>
  </div>
</body>
</html>
"""


def main():
    for page in PAGES:
        html = build_page(page)
        out_path = ROOT / page["file"]
        out_path.write_text(html)
        print(f"built {page['file']}")


if __name__ == "__main__":
    main()
