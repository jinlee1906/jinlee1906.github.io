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
]

SIDEBARS = {
    "home": (PARTIALS / "sidebar-home.html").read_text(),
    "project": (PARTIALS / "sidebar-project.html").read_text(),
}


def hex_background(count):
    hexes = "\n".join(f'      <div class="hex hex-{i}"></div>' for i in range(1, count + 1))
    return f'    <div class="hex-background" aria-hidden="true">\n{hexes}\n    </div>\n'


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
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="hexagons.css">
  <script src="script.js" defer></script>
</head>
<body>
  <div class="layout">
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
