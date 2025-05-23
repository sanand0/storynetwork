# Create the story network application

> Windsurf Claude 3.7 Sonnet: [eaa70bc5](https://github.com/sanand0/storynetwork/commit/eaa70bc5622df49bb963573eb0e94f8ba2f2f011)

Create `storynetwork`, an application to BEAUTIFULLY visualize entities (people, places, etc.) and their relationships in a story.

Create an `index.html`, a `script.js` (ESM) and a `config.json` for this application.

The app shows beautiful cards for pre-defined stories: The Mahabharatha, 12 Angry Men, Les Misérables, showing the name, notes, and icon (via iconify.design) using `config.json`

```json
{
  "demos": [
    { "icon": "...", "name": "The Mahabharatha", "notes": "...", "file": "mahabharatha.md", "entities": [ "Arjuna", "Krishna", "Duryodhana", ...]},
    { "icon": "...", "name": "12 Angry Men", "notes": "...", "file": "12_angry_men.md", "entities": [ "...", ...]},
    { "icon": "...", "name": "Les Misérables", "notes": "...", "file": "les_miserables.md", "entities": [ "...", ...]}
  ]
}
```

When a demo card is clicked, the app uses fields from a

1. Shows the .name as a title
2. Renders .notes as Markdown below that
3. Loads .file, parses as Markdown and renders 3 tabs: Presence, Correlation, Network.

## Presence Tab

Render each H2 sections as an `<svg data-index="${index}"><rect fill="some light color" width="${width}" height="12"></rect></svg>`. The width is proportional to # of chars in the section such that the max section length is 250. Add a line-break for each H1.

Then, for each entity in `entities` array, find the character offset where it occurs within each H2 section. Add a small `<circle cx="${x}" cy="${50 + random jitter}%" r="1" fill="${entityColor[entity]}">` for each entity. `x` is proportional to the character offset. Use a distinct color for each entity using D3's a built-in distinct color scheme. These are hidden by default.

Clicking on a section shows the contents of that section in a modal, rendered as Markdown, as well as the section's entities as pills, colored as per the entity color.

Show a list of entities as small buttons at the top. Mention the count of occurrences in small font in brackets. Clicking on an entity toggles the circles for that entity. By default, the entity toggle buttons at the top are btn-outlines with their color being their entity color. Use the appropriate --bs- color variables to style them.

## Correlation Tab

Count how often each pair of entities are present in the same H2 section. Then, create a compact table with rows as entities, columns as entities, and each cell being the count of times they occurred together in the same section. Sort the rows and columns alphabetically. Color the cell backgrounds using D3's blues scheme. Ensure that the cell text contrasts with the background. Fix the row height and column width to 2 em.  Rotate the column headers by 45 degrees for compactness and to avoid overlap.

Also draw a range slider on top. with values from 0 - max(pair counts). When the slider is moved, hide the cells to show only those with count >= slider value. Use D3 for rendering the table.

## Network Tab

Leave this empty for now.

## Coding Rules

- Write SHORT, CONCISE, READABLE code
- Write modular code (iteration, functions). No duplication
- Use functions, not classes
- Validate early. Use the if-return pattern. Avoid unnecessary else statements
- Avoid try blocks unless the operation is error-prone
- Use ESM: `<script type="module">`
- No TypeScript. Only JavaScript
- Use MODERN JavaScript. Minimize libraries
- Use hyphenated HTML class/ID names (id="user-id" not id="userId")
- For single line if / for statements, avoid { blocks }
- Use .insertAdjacentHTML / .replaceChildren (or lit-html). Avoid document.createElement
- Use Bootstrap classes for CSS. Avoid custom CSS
- Show errors to the user (beautifully). Avoid console.error()

Remember: The app should look BEAUTIFUL!

# Improve home page, add dark theme, fix bugs in appearance

The title of the home page looks dull. Modify it to add a jumbo header and engaging explanation of the app before the cards.

Add a navbar that allows dark-theme toggling. Here is sample code:

```html
<!-- Include Bootstrap 5.3+ and Bootstrap icons -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js"></script>

<nav class="navbar navbar-expand-lg bg-body-tertiary">
  <div class="container-fluid">
    <a class="navbar-brand" href="#">Title</a>

    <!-- Copy this dropdown anywhere in your page, e.g. inside a navbar -->
    <div class="position-relative" role="group" aria-label="Toggle dark mode" title="Toggle Dark Mode">
      <button class="dark-theme-toggle btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Open navigation menu">
        <i class="bi bi-circle-half"></i> <span class="d-lg-none ms-2">Toggle theme</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><button class="dropdown-item" data-bs-theme-value="light"><i class="me-2 bi bi-sun-fill"></i> Light</button></li>
        <li><button class="dropdown-item" data-bs-theme-value="dark"><i class="me-2 bi bi-moon-stars-fill"></i> Dark</button></li>
        <li><button class="dropdown-item" data-bs-theme-value="auto"><i class="me-2 bi bi-circle-half"></i> Auto</button></li>
      </ul>
    </div>

  </div>
</nav>

<script src="https://cdn.jsdelivr.net/npm/@gramex/ui@0.3/dist/dark-theme.js" type="module"></script>
```

Ensure that the app uses colors that will function in dark and light mode. Specifically, instead of hard-coding Bootstrap light/dark, use Bootstrap's built-in variables for body color and body background.

There are a few bugs to fix in "Presence":

- Click on a demo. Click on back. Click on another demo. The entities from the first demo are still present.
- Add a top/bottom margin to the entity buttons - same as the start/end margins.
- Let the `<rect>`s inside the SVG take up 100% height of the SVG.
- Increase the height of the SVGs to 24.
- Increase the size of the `<circle>`s to 3.

Fix this in "Correlation":

- Center the cell values vertically
- Make the table response
- Don't rotate the row headers. Just the column headers
- Reduce the cell size to 1em x 1em instead of 2em x 2em
- Ensure that the background of the column headers are transparent so that it does not overlap the range slider
