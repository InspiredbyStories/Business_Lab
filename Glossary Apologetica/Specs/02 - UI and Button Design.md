# Religious Studies Search Engine — UI Layout, Button Design, and Interaction Specification

## 1. Overall Design Direction

Implement the application using a design language that can be described as:

**Softly Rounded, Structured, Scholarly, and Modern.**

This application is a serious private research tool. It should feel like a combination of:

* A modern search engine
* A digital archive
* A research database
* A personal scholarly library

Do not make the entire interface overly rounded or use pill-shaped buttons for every component.

Different interface elements should use different levels of corner rounding depending on their purpose.

The visual hierarchy should distinguish between:

1. Search
2. Navigation
3. Actions
4. Filters
5. Research material
6. Metadata

---

# 2. Corner Radius System

Create a consistent corner-radius system.

Recommended design tokens:

```text
--radius-small: 8px
--radius-medium: 10px
--radius-large: 14px
--radius-search: 16px
--radius-pill: 999px
```

Use these consistently throughout the application.

Do not randomly assign different border-radius values to components.

---

# 3. Component Shape Rules

## Search Bar

The search bar should be one of the softest and most visually prominent elements.

Recommended:

```text
Border Radius: 14px–16px
Height: Approximately 48px–56px
Width: Large and prominent
```

Visual example:

```text
╭─────────────────────────────────────────────────────────────╮
│ 🔍  Search Quran, Hadith, scholars, and personal notes...  │
╰─────────────────────────────────────────────────────────────╯
```

Do not make the search bar an exaggerated full pill unless the design requires it.

It should feel modern and approachable while maintaining a structured appearance.

---

## Primary Buttons

Examples:

* Search
* Submit New Entry
* Save Entry
* Add New Entry

Recommended:

```text
Border Radius: 8px–10px
```

Primary buttons should be rounded rectangles, not full pills.

Example:

```text
╭──────────────────────╮
│     🔍  SEARCH       │
╰──────────────────────╯
```

Primary actions should use the currently selected religion's accent color.

For Version 1, this means the Islam accent color.

---

## Secondary Buttons

Examples:

* Cancel
* Clear Search
* Edit Entry
* Open Original File
* Back

Recommended:

```text
Border Radius: 8px–10px
```

Secondary buttons should generally use:

* Neutral backgrounds
* Subtle borders
* Neutral text

They should not visually compete with the primary action.

---

## Filters

Filters should use a pill shape.

Examples:

```text
( Quran )   ( Hadith )   ( Scholarly Work )   ( Personal Notes )
```

Use:

```text
Border Radius: 999px
```

The pill shape communicates that these are selectable categories or filters rather than primary actions.

Selected filters should use a subtle accent background rather than an aggressively saturated color.

---

## Tags

Tags should also use pill styling.

Example:

```text
( Jesus ) ( Isa ) ( Crucifixion )
```

Tags should remain smaller and visually quieter than filters.

---

## Search Result Cards

Search result cards should use:

```text
Border Radius: 10px–14px
```

Cards should feel like research records or archival documents.

Do not make them look like oversized buttons.

Each card should have:

* A subtle border
* Neutral background
* Small source identifier
* Clear title
* Text excerpt
* Metadata
* Optional tags
* A subtle action such as "View Entry →"

The entire card may be clickable, but it should not visually resemble a large button.

---

# 4. Overall Desktop Layout

Use a desktop layout with:

```text
LEFT SIDEBAR
+
MAIN RESEARCH WORKSPACE
```

Recommended structure:

```text
┌──────────────────────┬─────────────────────────────────────────────────┐
│                      │                                                 │
│  RELIGIOUS STUDIES   │  ISLAMIC STUDIES                                │
│  SEARCH ENGINE       │                                                 │
│                      │  Search your Islamic research database          │
│──────────────────────│                                                 │
│                      │  ╭───────────────────────────────────────────╮  │
│  ●  Islam            │  │ 🔍 Search Quran, Hadith, scholars...      │  │
│                      │  ╰───────────────────────────────────────────╯  │
│  + Add New Entry     │                                                 │
│                      │  ( Quran ) ( Hadith ) ( Scholarly Work )       │
│  Library             │                                                 │
│                      │                                                 │
│  Settings            │  ─────────────────────────────────────────────  │
│                      │                                                 │
│                      │  SEARCH RESULTS                                 │
│                      │                                                 │
│                      │  ╭───────────────────────────────────────────╮  │
│                      │  │ █ QURAN                                   │  │
│                      │  │                                           │  │
│                      │  │ Quran 4:157                               │  │
│                      │  │                                           │  │
│                      │  │ Relevant excerpt from stored material...  │  │
│                      │  │                                           │  │
│                      │  │                         View Entry →       │  │
│                      │  ╰───────────────────────────────────────────╯  │
│                      │                                                 │
└──────────────────────┴─────────────────────────────────────────────────┘
```

The exact spacing can be adjusted, but the layout should maintain this hierarchy.

---

# 5. Sidebar Design

The sidebar should feel stable, structured, and persistent.

It should not contain floating cards for every navigation item.

Recommended sidebar items:

```text
RELIGIOUS STUDIES

──────────────────

● Islam

+ Add New Entry

Library

Settings
```

Future religious categories may eventually appear in this area.

Example future structure:

```text
RELIGIONS

● Islam
  Christianity
  Judaism
  Hinduism
  Buddhism
```

Only Islam should be implemented for Version 1.

---

# 6. Selected Religion Button

The currently selected religion should use a softly rounded rectangular container.

Do not use a pill.

Example:

```text
╭───────────────────╮
│ ●  Islam          │
╰───────────────────╯
```

Recommended:

```text
Border Radius: 8px–12px
```

When selected:

* Use the religion's subtle accent background.
* Use the religion's primary accent color for the icon or indicator.
* Maintain readable text.
* Do not fill the entire sidebar with the accent color.

The active state should clearly communicate:

```text
Currently Searching:
Islam
```

---

# 7. Search Area

The search area should be the primary focal point of the main workspace.

Recommended hierarchy:

```text
ISLAMIC STUDIES

Search your Quran, Hadith, scholarly work,
and personal research.
```

Below this:

```text
╭──────────────────────────────────────────────────────────────╮
│ 🔍  Search Quran, Hadith, scholars, and personal notes...   │
╰──────────────────────────────────────────────────────────────╯
```

The search field should be large enough to encourage natural-language searching.

Examples:

```text
What does the Quran say about Jesus?
```

```text
Jesus crucifixion
```

```text
passages discussing previous scriptures
```

The search system will handle exact and semantic retrieval as previously specified.

---

# 8. Search Button Design

The Search button should sit naturally alongside or near the search bar.

Recommended layout:

```text
╭───────────────────────────────────────────────╮  ╭────────────╮
│ 🔍 Search Islamic sources...                  │  │   Search   │
╰───────────────────────────────────────────────╯  ╰────────────╯
```

Alternatively, on smaller desktop windows:

```text
╭──────────────────────────────────────────────────────────────╮
│ 🔍 Search Islamic sources...                                 │
╰──────────────────────────────────────────────────────────────╯

╭──────────────────╮
│    🔍 SEARCH     │
╰──────────────────╯
```

The Search button should use the primary Islam accent.

Do not use a gradient unless it is extremely subtle.

The default button should be a solid, restrained color.

---

# 9. Search Bar Focus State

When the user clicks into the search bar, create a subtle active state.

Do not use:

* Bright glowing neon borders
* Heavy animation
* Flashing effects

Recommended focus behavior:

```text
Default:
Neutral Border

↓

Focused:
Accent Border
+
Very subtle accent shadow or glow
```

The accent may be implemented with a restrained gradient or transition.

For example:

```text
Neutral Slate → Emerald Accent → Neutral Slate
```

This can be applied subtly around portions of the search border.

The effect should communicate:

```text
The search field is active.
```

It should not become a decorative visual effect.

---

# 10. Button Interaction System

Implement consistent interaction states.

Every interactive button should have:

```text
DEFAULT
↓
HOVER
↓
ACTIVE
↓
DISABLED
```

For outlined secondary buttons:

### Default

```text
Transparent or neutral background
+
Subtle border
```

### Hover

```text
Subtle background change
+
Border shifts toward accent color
```

### Active

```text
Slightly stronger accent treatment
```

For primary buttons:

### Default

```text
Solid accent color
```

### Hover

```text
Slightly darker or lighter accent variation
```

### Active

```text
Slightly compressed or darker state
```

Do not use excessive scaling or bouncing animations.

A subtle:

```text
100% → 98%
```

press state is acceptable.

---

# 11. Outlined Button Style

Use outlined buttons for secondary or less important actions.

Example:

```text
╭──────────────────────╮
│    + Add New Entry   │
╰──────────────────────╯
```

Default:

* Transparent background
* Neutral border
* Primary text

Hover:

* Slight accent-tinted background
* Accent border
* Accent text where appropriate

This should create an interaction pattern where the interface is mostly quiet until the user interacts with it.

---

# 12. Primary Action Hierarchy

At any given location, avoid having multiple primary-colored buttons competing for attention.

Example:

```text
PRIMARY ACTION

[ Submit New Entry ]
```

Secondary actions:

```text
[ Cancel ]

[ Save Draft ]

[ Clear ]
```

Only the most important action should receive the strong accent fill.

---

# 13. Search Filters Layout

Place filters directly below the search bar.

Example:

```text
FILTER RESULTS

( All ) ( Quran ) ( Hadith ) ( Scholarly Work ) ( Personal Notes )
```

The default selection can be:

```text
( ✓ All )
```

When a filter is selected, use:

* Subtle accent background
* Accent border
* Accent text or icon

Do not make every filter fully saturated.

The filters should visually feel lightweight and quickly selectable.

---

# 14. Search Results Layout

Results should appear below the search controls.

Recommended:

```text
SEARCH RESULTS
24 Results Found
```

Then group them:

```text
QURAN
────────────────────────────────────

[ Result Card ]

[ Result Card ]


HADITH
────────────────────────────────────

[ Result Card ]

[ Result Card ]


ISLAMIC SCHOLARLY WORK
────────────────────────────────────

[ Result Card ]


PERSONAL NOTES
────────────────────────────────────

[ Result Card ]
```

Only display groups that actually contain results.

Do not display an empty Quran section if no Quran results were found.

---

# 15. Search Result Card Structure

Recommended:

```text
╭──────────────────────────────────────────────────────────────╮
│ █ QURAN                                                      │
│                                                              │
│ Quran 4:157                                                  │
│ Surah An-Nisa                                                │
│                                                              │
│ "Relevant excerpt from the stored material..."               │
│                                                              │
│ ( Jesus ) ( Isa ) ( Crucifixion )                            │
│                                                              │
│                                           View Entry →       │
╰──────────────────────────────────────────────────────────────╯
```

The colored source indicator can be:

* A thin vertical line
* A small square
* A badge

Do not make the entire card the source color.

---

# 16. Result Card Hover Behavior

When hovering over a result:

Recommended:

```text
Default:
Neutral surface
Subtle border

Hover:
Slightly elevated surface
Slightly stronger border
Very subtle shadow
```

Do not create large movement.

A slight visual elevation is sufficient.

Example conceptual behavior:

```text
Shadow:
None or extremely subtle

↓

Hover:

Slight increase in elevation
```

The application should feel responsive without becoming visually distracting.

---

# 17. Entry Viewer Layout

When a user opens an entry, use a focused reading layout.

Recommended structure:

```text
← Back to Results


Quran 4:157

QURAN
Islam

────────────────────────────────────────────

FULL TEXT

[Full entry text]

────────────────────────────────────────────

METADATA

Collection:
Language:
Date:
Author:

────────────────────────────────────────────

TAGS

( Jesus ) ( Isa ) ( Crucifixion )

────────────────────────────────────────────

PERSONAL NOTES

[User's personal notes]

────────────────────────────────────────────

RELATED ENTRIES

[ Related Entry ]
[ Related Entry ]
[ Related Entry ]
```

The reading experience should be calmer and less visually busy than the search page.

---

# 18. Entry Page Action Buttons

Place actions near the top-right or in a clear action area.

Examples:

```text
[ Edit Entry ]

[ Open Original File ]

[ More ⋯ ]
```

Do not make every action a large primary button.

Recommended hierarchy:

```text
Edit Entry → Secondary or accent outlined

Open Original File → Neutral outlined

More → Icon button or dropdown
```

---

# 19. Add New Entry Layout

The Add New Entry page should use a structured form layout.

Recommended:

```text
ADD NEW ENTRY

Category
[ Islam ▼ ]

────────────────────────────

SOURCE INFORMATION

Title
[________________________]

Source
[ Quran ▼ ]

Collection
[________________________]

Book / Surah
[________________________]

Chapter
[________________________]

Verse / Ayah / Hadith Number
[________________________]

────────────────────────────

CONTENT

Text

╭─────────────────────────────────────────────╮
│                                             │
│                                             │
│                                             │
╰─────────────────────────────────────────────╯

────────────────────────────

UPLOAD FILE

[ + Upload File ]

PDF • TXT • DOCX • PNG • JPG

────────────────────────────

TAGS

[ Add Tag... ]

( Existing Tag ) ( Existing Tag )

────────────────────────────

PERSONAL NOTES

╭─────────────────────────────────────────────╮
│                                             │
│                                             │
╰─────────────────────────────────────────────╯

────────────────────────────

[ Cancel ]              [ Submit New Entry ]
```

The form should prioritize readability and organization.

Avoid placing too many fields side-by-side.

---

# 20. File Upload Button

The upload area should feel distinct but not oversized.

Recommended:

```text
╭──────────────────────────────────────────────╮
│                                              │
│              ↑                               │
│                                              │
│          Upload File                         │
│                                              │
│      PDF • TXT • DOCX • PNG • JPG            │
│                                              │
╰──────────────────────────────────────────────╯
```

This can use a dashed or subtle border.

On hover:

* Slight accent border
* Subtle accent-tinted background

Do not use an aggressively colored upload area.

---

# 21. Supporting and Contradicting Material Controls

After search results are displayed, include additional retrieval actions.

Recommended:

```text
EXPLORE THIS SEARCH

[ Related Material ]

[ Supporting Material ]

[ Potentially Contradicting Material ]
```

These should not all appear as filled primary buttons.

Recommended hierarchy:

```text
Related Material
→ Neutral or outlined

Supporting Material
→ Subtle teal or green treatment

Potentially Contradicting Material
→ Subtle amber or muted rose treatment
```

The system is retrieving potentially relevant information.

Therefore, avoid aggressive visual language that implies:

```text
CORRECT
WRONG
TRUE
FALSE
```

The user should make the final interpretive determination.

---

# 22. Settings Layout

The Settings page should be simple and structured.

Example:

```text
SETTINGS

────────────────────────────

APPEARANCE

○ System Default

○ Light Mode

○ Dark Mode

────────────────────────────

SEARCH

Semantic Search
[ Enabled ]

Exact Match Priority
[ High ]

────────────────────────────

DATABASE

Total Entries: 1,245

[ Export Database ]

[ Backup Database ]

────────────────────────────
```

Use structured sections rather than floating cards for every individual setting.

---

# 23. Dark Mode Layout Behavior

Dark Mode should maintain the exact same layout and geometry as Light Mode.

Only the theme colors should change.

Do not redesign the entire application when switching themes.

Maintain:

* Same spacing
* Same corner radii
* Same button hierarchy
* Same layout
* Same navigation

Only visual tokens should change.

---

# 24. Spacing System

Use a consistent spacing scale.

Recommended:

```text
--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-lg: 16px
--space-xl: 24px
--space-2xl: 32px
--space-3xl: 48px
```

Do not use arbitrary spacing values throughout the application.

The interface should feel deliberate and organized.

---

# 25. Recommended Layout Hierarchy

The primary screen hierarchy should always prioritize:

```text
1. CURRENT RELIGION
        ↓
2. SEARCH
        ↓
3. FILTERS
        ↓
4. SEARCH RESULTS
        ↓
5. SOURCE IDENTIFICATION
        ↓
6. ENTRY DETAILS
```

The user should immediately understand:

* Where they are
* Which religious category they are searching
* What they can search
* How to narrow the results
* Where each result comes from

---

# 26. Avoid These Design Patterns

Do not implement:

* Pill-shaped buttons for every UI component
* Excessive gradients
* Heavy drop shadows
* Glassmorphism as the dominant design style
* Neon borders
* Excessive glowing effects
* Animated backgrounds
* Excessive rounded cards
* Multiple primary-colored buttons competing on the same screen
* Rainbow-colored search results
* Overly ornate religious imagery

The application should remain focused on research and reading.

---

# 27. Final Design System Summary

Use this shape hierarchy:

```text
SEARCH BAR
Soft rounded rectangle
14px–16px

PRIMARY BUTTONS
Moderately rounded rectangle
8px–10px

SECONDARY BUTTONS
Moderately rounded rectangle
8px–10px

FILTERS
Pill-shaped
999px

TAGS
Pill-shaped
999px

SEARCH RESULT CARDS
Soft rectangle
10px–14px

SIDEBAR NAVIGATION
Structured with subtle rounding
8px–12px

ICON BUTTONS
Rounded square
Approximately 8px
```

The final interface should feel:

**Modern without being trendy.**

**Soft without being overly rounded.**

**Structured without being rigid.**

**Visually calm without being boring.**

The application should prioritize long-term usability, research efficiency, and reading comfort above decorative design.
