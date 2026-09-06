# Religious Studies Search Engine — Color System, Light Mode, and Dark Mode Specification

## 1. Design Philosophy

Implement a visual design system for the Religious Studies Search Engine that communicates:

* Serious academic research
* Trustworthiness
* Organization
* Historical depth
* Readability
* Long-term usability

The application should feel like a combination of:

* A modern research application
* A digital archive
* A personal scholarly library

Avoid making the application look like:

* A generic corporate dashboard
* A stereotypical religious website
* A heavily ornamental manuscript
* A bright or overly colorful application

The interface should remain primarily neutral.

Religious categories should influence the interface through **accent colors**, rather than completely changing the application's overall visual identity.

The application must support both:

* Light Mode
* Dark Mode

The user should be able to manually switch between them.

Optionally, the application may later support:

* System Default
* Light
* Dark

---

# 2. Core Color Theory

Use a restrained color hierarchy.

The approximate visual distribution should be:

* 70–80% neutral background and surface colors
* 15–25% structural colors
* 5–10% accent colors

Accent colors should be used intentionally for:

* Active religion categories
* Selected navigation items
* Primary actions
* Search highlights
* Selected filters
* Important status indicators
* Small visual identifiers

Do not use the accent color excessively across large areas of the interface.

The overall application should remain visually calm, especially because users may spend long periods reading and researching.

---

# 3. Base Application Identity

The core application should use a scholarly palette built around:

* Deep navy
* Slate
* Warm off-white
* Charcoal
* Muted accent colors

The base application identity should remain consistent regardless of which religion is selected.

The currently selected religion should primarily control the accent color.

Conceptually:

```text
BASE APPLICATION DESIGN
        +
SELECTED RELIGION ACCENT
        =
CURRENT VISUAL CONTEXT
```

For Version 1:

```text
Selected Religion: Islam
Accent Color: Deep Emerald
```

---

# 4. Light Mode Color System

Light Mode should not use pure white everywhere.

Pure white can create excessive glare during long reading sessions.

Instead, use a slightly warm, parchment-inspired neutral background.

## Main Background

```text
Name: Parchment White
HEX: #F5F1E8
```

Use for:

* Main application background
* Large reading areas
* General workspace

---

## Elevated Surface / Cards

```text
Name: Soft Ivory
HEX: #FFFCF5
```

Use for:

* Search result cards
* Entry panels
* Forms
* Modals
* Elevated content surfaces

This should provide a subtle distinction from the main background without relying heavily on shadows.

---

## Primary Structural Color

```text
Name: Deep Navy
HEX: #0F172A
```

Use for:

* Sidebar
* Primary navigation
* Application identity areas
* Major structural elements

Do not use Deep Navy as the main reading background in Light Mode.

---

## Primary Text

```text
Name: Dark Slate
HEX: #1E293B
```

Use for:

* Main headings
* Body text
* Important metadata

---

## Secondary Text

```text
Name: Muted Slate
HEX: #64748B
```

Use for:

* Secondary metadata
* Dates
* Source information
* Less important labels

---

## Borders and Dividers

```text
Name: Warm Gray
HEX: #D6D3CC
```

Use subtle borders around:

* Search results
* Forms
* Entry sections
* Dividers

Borders should not be visually heavy.

---

# 5. Light Mode Islam Accent System

The primary accent for Islam should be a deep emerald.

## Primary Islam Accent

```text
Name: Deep Emerald
HEX: #0F6B4F
```

Use for:

* Active Islam category
* Primary buttons
* Active navigation indicators
* Selected filters
* Search focus states
* Important links

---

## Hover Accent

```text
Name: Forest Emerald
HEX: #0B573F
```

Use for:

* Button hover states
* Active interaction states

---

## Light Accent Background

```text
Name: Pale Emerald
HEX: #DCEFE7
```

Use for:

* Selected search results
* Active filter backgrounds
* Subtle highlights
* Selected tags

Do not use this as the main application background.

---

# 6. Dark Mode Design Philosophy

Dark Mode should not simply invert Light Mode.

Avoid using:

```text
Pure Black: #000000
Pure White: #FFFFFF
```

as the dominant colors.

Pure black combined with bright white text can create excessive visual contrast and eye strain.

Instead, use:

* Very dark navy
* Dark charcoal
* Soft gray text
* Muted accent colors

The goal should be a comfortable research environment suitable for long reading sessions.

---

# 7. Dark Mode Color System

## Main Background

```text
Name: Midnight Navy
HEX: #0B1120
```

Use for:

* Main application background
* Large empty workspace areas

---

## Sidebar / Navigation

```text
Name: Deep Navy
HEX: #111827
```

Use for:

* Sidebar
* Navigation
* Application identity area

The sidebar should be visually distinguishable from the main background without being dramatically lighter.

---

## Elevated Surface / Cards

```text
Name: Slate Surface
HEX: #182235
```

Use for:

* Search result cards
* Forms
* Entry panels
* Modals
* Expandable sections

---

## Secondary Surface

```text
Name: Elevated Slate
HEX: #223047
```

Use sparingly for:

* Hover states
* Selected cards
* Secondary panels
* Expanded sections

---

## Primary Text

Avoid pure white.

Use:

```text
Name: Soft Ivory
HEX: #E8E6E1
```

Use for:

* Headings
* Primary reading text
* Important information

---

## Secondary Text

```text
Name: Cool Gray
HEX: #A7B0BE
```

Use for:

* Metadata
* Dates
* Secondary labels
* Supporting information

---

## Borders

```text
Name: Dark Slate Border
HEX: #2B384D
```

Use for:

* Card borders
* Dividers
* Input fields

Borders should remain subtle.

---

# 8. Dark Mode Islam Accent System

The Islam accent should remain visually related to the Light Mode emerald while being adjusted for visibility against dark surfaces.

## Primary Accent

```text
Name: Emerald
HEX: #2FA879
```

Use for:

* Active Islam category
* Primary buttons
* Active navigation
* Selected filters
* Important links

This should be slightly brighter than the Light Mode accent so it remains visible against dark backgrounds.

---

## Hover Accent

```text
Name: Bright Emerald
HEX: #3FC48E
```

Use for:

* Button hover
* Interactive elements
* Active controls

---

## Selected Background

```text
Name: Deep Emerald Surface
HEX: #123D31
```

Use for:

* Selected navigation items
* Selected search results
* Active filters

The text placed on this surface should remain highly readable.

---

# 9. Complete Theme Variables

Implement the application's colors as reusable theme variables rather than hard-coding colors throughout the interface.

Example conceptual structure:

```text
LIGHT MODE

--background: #F5F1E8
--surface: #FFFCF5
--surface-secondary: #EEEAE1

--sidebar: #0F172A

--text-primary: #1E293B
--text-secondary: #64748B

--border: #D6D3CC

--accent-primary: #0F6B4F
--accent-hover: #0B573F
--accent-subtle: #DCEFE7


DARK MODE

--background: #0B1120
--surface: #182235
--surface-secondary: #223047

--sidebar: #111827

--text-primary: #E8E6E1
--text-secondary: #A7B0BE

--border: #2B384D

--accent-primary: #2FA879
--accent-hover: #3FC48E
--accent-subtle: #123D31
```

The actual implementation can use CSS variables, a theme object, design tokens, or the appropriate theme system for the chosen technology stack.

The important requirement is:

**Colors must not be scattered as hard-coded values throughout individual components.**

---

# 10. Religion Accent Architecture

The application must be designed so additional religious categories can eventually receive their own accent colors.

The core interface should remain neutral.

Only accent tokens should change when switching between religious categories.

Conceptually:

```text
GLOBAL THEME
    ↓
Light or Dark Mode
    ↓
Selected Religion
    ↓
Religion Accent Tokens
```

Example future structure:

```text
Islam
Primary Accent: Emerald

Christianity
Primary Accent: Deep Burgundy or Royal Blue

Judaism
Primary Accent: Deep Blue

Hinduism
Primary Accent: Muted Saffron

Buddhism
Primary Accent: Warm Ochre

Greek Mythology
Primary Accent: Aegean Blue

Norse Mythology
Primary Accent: Steel Blue

Pagan Traditions
Primary Accent: Forest Green / Earth Tone
```

Do not fully implement these future religion themes yet.

However, the application's theme architecture should support adding them later.

---

# 11. Source Type Color Differentiation

Within the Islam category, search results should be distinguishable by source type.

Do not make the entire cards different colors.

Instead, use subtle indicators such as:

* Small vertical accent line
* Badge
* Icon
* Section heading accent

Suggested Version 1 colors:

## Quran

```text
Accent: Emerald
```

The Quran should visually align closely with the primary Islam accent.

---

## Hadith

```text
Accent: Muted Teal
Light Mode: #2D7A78
Dark Mode: #4FA9A5
```

---

## Islamic Scholarly Work

```text
Accent: Muted Blue
Light Mode: #4B6B8A
Dark Mode: #7D9DBD
```

---

## Personal Notes

```text
Accent: Muted Amber
Light Mode: #A66B16
Dark Mode: #D49A3A
```

Personal Notes must remain visually distinct from primary religious texts.

The UI should make it immediately obvious when something is:

* A Quranic text
* A Hadith
* Scholarly work
* The user's own notes

Do not allow Personal Notes to visually resemble or be confused with primary religious sources.

---

# 12. Search Result Card Design

Search results should remain primarily neutral.

Example:

```text
┌──────────────────────────────────────────────┐
│ █ QURAN                                      │
│                                               │
│ Quran 4:157                                  │
│                                               │
│ Relevant text excerpt from the stored entry. │
│                                               │
│ Tags: Jesus • Isa • Crucifixion              │
│                                               │
│ [ View Full Entry ]                          │
└──────────────────────────────────────────────┘
```

The colored indicator should be subtle.

Do not use a fully green card for Quran results.

Recommended:

* Neutral card background
* Small colored source indicator
* Strong readable typography
* Clear source label

---

# 13. Selected Islam Category Button

The Islam category should be visually prominent when selected.

## Light Mode

```text
Background: #DCEFE7
Text: #0F6B4F
Active Indicator: #0F6B4F
```

## Dark Mode

```text
Background: #123D31
Text: #2FA879
Active Indicator: #2FA879
```

The selected category should be immediately identifiable without dominating the screen.

---

# 14. Search Bar

The search bar is the primary interaction point and should receive visual emphasis.

## Light Mode

```text
Background: #FFFCF5
Border: #D6D3CC
Text: #1E293B

Focused Border:
#0F6B4F
```

When focused, the search bar may use a subtle emerald outline or glow.

Avoid aggressive glowing effects.

---

## Dark Mode

```text
Background: #182235
Border: #2B384D
Text: #E8E6E1

Focused Border:
#2FA879
```

The focused search field should clearly indicate that the user is currently typing.

---

# 15. Primary Buttons

The primary action button should use the currently active religion's accent color.

For Version 1:

```text
SEARCH
SUBMIT NEW ENTRY
```

should use the Islam accent.

## Light Mode

```text
Background: #0F6B4F
Text: #FFFFFF

Hover:
#0B573F
```

## Dark Mode

```text
Background: #2FA879
Text: #08120E

Hover:
#3FC48E
```

The dark-mode button text should use a dark color if necessary to maintain strong contrast.

---

# 16. Secondary Buttons

Secondary buttons should remain neutral.

Examples:

```text
Cancel
Clear Search
Edit Entry
Open Original File
```

## Light Mode

```text
Background: Transparent or #FFFCF5
Border: #D6D3CC
Text: #1E293B
```

## Dark Mode

```text
Background: Transparent or #182235
Border: #2B384D
Text: #E8E6E1
```

Secondary buttons should not compete visually with primary actions.

---

# 17. Potentially Supporting and Contradicting Material

The application will eventually include retrieval buttons such as:

```text
[ SHOW RELATED MATERIAL ]

[ SHOW SUPPORTING MATERIAL ]

[ SHOW POTENTIALLY CONTRADICTING MATERIAL ]
```

These should not use aggressive red and green because:

1. The system is retrieving material rather than declaring objective truth.
2. "Contradicting" material may be interpretive.
3. Red can imply an error or failure.

Recommended treatment:

## Related Material

Neutral blue/slate indicator.

## Supporting Material

Muted teal or subtle green.

## Potentially Contradicting Material

Muted amber or muted rose.

Avoid bright:

```text
#FF0000
#00FF00
```

Use restrained academic colors instead.

---

# 18. Dark Mode Reading Experience

Because this application will contain potentially large amounts of religious and academic text, optimize Dark Mode for reading.

Requirements:

* Avoid pure black backgrounds.
* Avoid pure white body text.
* Maintain sufficient contrast.
* Use comfortable line spacing.
* Allow the reading area to be visually calmer than the navigation area.
* Avoid excessive borders.
* Avoid glowing effects.

The primary text should be a soft off-white.

Long-form text should not use bright accent colors.

Accent colors should be reserved for:

* Links
* Tags
* Selected elements
* Interactive controls
* Search highlights

---

# 19. Theme Switcher

Include a theme control in the application's settings or top navigation.

Suggested options:

```text
APPEARANCE

○ System Default

○ Light Mode

○ Dark Mode
```

The selected preference should persist locally.

On future launches, the application should remember the user's preferred appearance.

If System Default is selected, the application should follow the operating system's appearance preference.

---

# 20. Accessibility Requirements

All colors should be evaluated for readability and contrast.

The application should not rely exclusively on color to communicate meaning.

For example:

Do not distinguish Quran and Hadith only through green versus teal.

Also use:

* Text labels
* Icons
* Section headings
* Source badges

The user should still be able to understand the interface if colors are difficult to distinguish.

Maintain appropriate contrast for:

* Body text
* Buttons
* Input fields
* Active navigation
* Selected filters

---

# 21. Animation and Visual Effects

Keep animations minimal and functional.

Recommended:

* Subtle hover transitions
* Small fade transitions when changing themes
* Gentle expansion for entry details
* Smooth state transitions

Avoid:

* Excessive motion
* Large glowing effects
* Animated backgrounds
* Flashing colors
* Decorative effects that interfere with reading

This is a research application, not an entertainment interface.

---

# 22. Final Visual Identity

The intended visual identity should be:

```text
MODERN
+
SCHOLARLY
+
PRIVATE RESEARCH TOOL
+
DIGITAL ARCHIVE
+
COMFORTABLE FOR LONG READING SESSIONS
```

The application should feel serious and well-organized without feeling sterile.

The visual hierarchy should prioritize:

1. Search
2. Search results
3. Source identification
4. Reading
5. Research organization

The color system should support future expansion without requiring a redesign when new religious categories are added.

---

# 23. Implementation Requirement

Before applying the final colors throughout the application, create the theme system first.

Do not hard-code colors directly into individual UI components.

Instead, create reusable design tokens for:

```text
BACKGROUND
SURFACE
SURFACE SECONDARY

TEXT PRIMARY
TEXT SECONDARY

BORDER

ACCENT PRIMARY
ACCENT HOVER
ACCENT SUBTLE

SOURCE QURAN
SOURCE HADITH
SOURCE SCHOLARLY
SOURCE PERSONAL NOTES
```

Each token should have a Light Mode and Dark Mode value.

This will allow future religion categories to modify accent colors without rewriting the application's UI.

The initial implementation should support:

```text
Theme:
Light
Dark
System

Religion:
Islam

Source Groups:
Quran
Hadith
Islamic Scholarly Work
Personal Notes
```

The end result should be a clean, modern, academically oriented desktop application that is comfortable to use for long periods of religious research and can visually expand into multiple religious traditions in the future.
