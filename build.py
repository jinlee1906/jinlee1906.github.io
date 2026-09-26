#!/usr/bin/env python3
"""Generates the site's static HTML pages from partials/ and content/.

Run `python3 build.py` after editing anything in content/ or partials/,
or after changing PAGES below. Output files are written to the repo root
with the same filenames the site has always used, so nothing else about
hosting or linking changes.
"""
import pathlib

ROOT = pathlib.Path(__file__).parent
PARTIALS = ROOT / "partials"
CONTENT = ROOT / "content"

PAGES = [
    {"file": "index.html", "title": "JINLEE | Portfolio",
     "description": "Jin Lee — chemical engineering student. Projects in battery design, soft robotics, CAD, and perfumery.",
     "sidebar": "home", "hex_count": 9, "ornaments": True},
    {"file": "perfume.html", "title": "Perfumery",
     "description": "Perfume design and formulation notes by Jin Lee.",
     "sidebar": "project", "hex_count": 6},
    {"file": "brandstorm.html", "title": "L'oreal Brandstorm",
     "description": "L'oreal Brandstorm wearable perfume watch concept by Jin Lee.",
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


# Skeletal-formula style motifs (plain bond lines, no fill), each in a
# 0-0-100-100 viewBox so they drop into any .hex-N sized box.
MOLECULES = [
    # zigzag alkane chain (hexane-like)
    '<polyline points="10,68 29,40 48,68 67,40 86,68"/>',
    # branched chain with a methyl branch
    '<polyline points="12,78 30,52 48,78 66,52 84,78"/><line x1="30" y1="52" x2="19" y2="26"/>',
    # plain ring (cyclohexane)
    '<polygon points="85,50 67.5,19.7 32.5,19.7 15,50 32.5,80.3 67.5,80.3"/>',
    # ring with one double bond (cyclohexene)
    '<polygon points="85,50 67.5,19.7 32.5,19.7 15,50 32.5,80.3 67.5,80.3"/>'
    '<line x1="78" y1="52" x2="63.5" y2="26.5"/>',
    # triple bond chain (hexyne-like)
    '<line x1="10" y1="76" x2="28" y2="50"/>'
    '<line x1="28" y1="46" x2="72" y2="46"/>'
    '<line x1="28" y1="50" x2="72" y2="50"/>'
    '<line x1="28" y1="54" x2="72" y2="54"/>'
    '<line x1="72" y1="50" x2="90" y2="76"/>',
]


def hex_background(count):
    hexes = []
    for i in range(1, count + 1):
        motif = MOLECULES[(i - 1) % len(MOLECULES)]
        hexes.append(
            f'      <div class="hex hex-{i}"><svg viewBox="0 0 100 100" class="bond-svg">{motif}</svg></div>'
        )
    return '    <div class="hex-background" aria-hidden="true">\n' + "\n".join(hexes) + '\n    </div>\n'


# Icon + label show the *current* theme; CSS picks which pair is visible.
THEME_TOGGLE = """  <button class="theme-toggle" type="button">
    <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    <span class="theme-label theme-label-dark">Dark mode<span class="sr-only">, switch to light mode</span></span>
    <span class="theme-label theme-label-light">Light mode<span class="sr-only">, switch to dark mode</span></span>
  </button>
"""

PAGE_ORNAMENTS = """    <div class="page-ornaments" aria-hidden="true">
      <span class="glow-ring ring-1"></span>
      <span class="glow-ring ring-2"></span>
    </div>
"""


def build_page(page):
    content = (CONTENT / page["file"]).read_text()
    sidebar = SIDEBARS[page["sidebar"]]
    ornaments = PAGE_ORNAMENTS if page.get("ornaments") else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{page["title"]}</title>
  <meta name="description" content="{page["description"]}">
  <script>try{{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}}catch(e){{}}</script>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="hexagons.css">
  <script src="script.js" defer></script>
</head>
<body>
{THEME_TOGGLE}  <div class="layout">
{hex_background(page["hex_count"])}
{ornaments}{sidebar}
    <main class="content">
{content}    </main>
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
