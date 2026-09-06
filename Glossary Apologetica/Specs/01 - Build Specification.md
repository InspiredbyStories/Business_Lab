# Islamic Religious Studies Search Engine — Version 1 Build Specification

## 1. Project Overview

Build a **private, local desktop application** designed for religious studies and research.

The application will eventually support multiple religious traditions and categories, including:

* Christianity
* Islam
* Judaism
* Hinduism
* Buddhism
* Greek mythology
* Norse mythology
* Pagan traditions
* Other religious and historical traditions

However, **Version 1 must focus exclusively on Islam**.

The application should be designed with future expansion in mind, but do not build unnecessary categories or features yet.

The first version should have a single primary category:

# Islam

When the user selects the **Islam** category, all searches and results must be restricted exclusively to material stored within the Islam category.

No Christian, Jewish, Hindu, Greek, Norse, pagan, or other religious material should appear in these search results.

---

# 2. Primary Purpose

The application is a **search and retrieval system**, not an AI research assistant.

The user will personally provide the material that is stored in the application.

The application must search only the information that has been added or uploaded by the user.

The system should not:

* Generate theological answers
* Research the internet
* Pull information from outside databases
* Use general AI knowledge to answer questions
* Invent interpretations
* Summarize material as though it were an independent authority

The system's purpose is to help the user quickly locate relevant information from their own research database.

The application should function more like an intelligent personal research library.

---

# 3. Version 1 Category Structure

The initial application should contain one category:

## Islam

Inside the Islam category, entries should eventually be organized into at least the following source groups:

### Quran

Material originating from:

* The Quran
* Individual surahs
* Individual ayahs
* Quranic translations provided by the user

### Hadith

Material originating from:

* Hadith collections
* Individual hadith
* Hadith commentary provided by the user

The system should be flexible enough to support different collections, such as:

* Sahih al-Bukhari
* Sahih Muslim
* Sunan Abu Dawud
* Jami` at-Tirmidhi
* Sunan an-Nasa'i
* Sunan Ibn Majah

However, do not require these collections to exist yet. The user should be able to create or enter them as material is added.

### Islamic Scholarly Work

This section may include:

* Academic papers
* Books
* Articles
* Scholarly commentary
* Historical analysis
* Personal research material

---

# 4. Main Application Interface

The desktop application should initially have a simple and clean layout.

Suggested structure:

```text
┌──────────────────────────────────────────────┐
│        RELIGIOUS STUDIES SEARCH ENGINE       │
├──────────────────────────────────────────────┤
│                                              │
│              [ ISLAM ]                       │
│                                              │
│         Search Islamic Sources               │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Search Quran, Hadith, scholars, notes │  │
│  └────────────────────────────────────────┘  │
│                                              │
│               [ SEARCH ]                     │
│                                              │
│        [ + ADD NEW ENTRY ]                   │
│                                              │
└──────────────────────────────────────────────┘
```

The Islam button should function as the currently selected religious category.

All searches performed in this section must be scoped to:

```text
Religion Category = Islam
```

The architecture should allow additional category buttons to be added in the future without redesigning the entire application.

For example:

```text
[ Christianity ] [ Islam ] [ Hinduism ] [ Judaism ]
```

But for Version 1, only **Islam** needs to be implemented.

---

# 5. Search System

The search system is one of the most important components of the application.

It must support a **hybrid search system**.

This means combining:

## A. Exact Search

The system should prioritize exact matches.

Example:

Search:

```text
Jesus son of Mary
```

The system should identify entries containing:

```text
Jesus son of Mary
```

Exact phrase matches should receive a strong relevance boost.

The search should also support:

* Exact word matching
* Exact phrase matching
* Partial keyword matching

---

## B. Semantic Search

The system should also search based on meaning.

Example search:

```text
Does the Quran say Jesus was crucified?
```

The system should be capable of locating entries discussing:

* Jesus
* Crucifixion
* Killing
* Death
* The relevant Quranic passages

Even if the exact search phrase does not appear in the stored text.

Semantic search should retrieve conceptually related material from the user's uploaded database.

---

## C. Hybrid Ranking

Exact matches should generally receive additional priority.

The search ranking should combine:

1. Exact phrase match
2. Exact keyword match
3. Partial keyword match
4. Semantic similarity
5. Metadata matches
6. Tag matches
7. Personal note matches

A strong exact match should generally rank above a merely semantically similar result.

The system should return results ranked from most relevant to least relevant.

---

# 6. Search Results

When a user searches within Islam, the results should be separated into groups.

Example:

Search:

```text
Jesus crucifixion
```

Results could appear as:

```text
SEARCH RESULTS
────────────────────────

QURAN
────────────────────────

Quran 4:157

[Relevant text excerpt]

Relevance: Very High

[ View Entry ]

────────────────────────

HADITH
────────────────────────

Relevant Hadith Entry

[Relevant text excerpt]

Relevance: High

[ View Entry ]

────────────────────────

ISLAMIC SCHOLARLY WORK
────────────────────────

Author / Paper / Book

[Relevant excerpt]

Relevance: Medium

[ View Entry ]

────────────────────────

PERSONAL NOTES
────────────────────────

User's relevant notes connected to this topic.
```

The exact UI can be improved, but the principle is important:

**Results should be grouped according to their source type while remaining inside the Islam category.**

---

# 7. Add New Entry System

The application must include a button:

```text
+ ADD NEW ENTRY
```

Clicking this should open an entry creation page.

The first field should be:

## Religion Category

Initially:

```text
Category:
[ Islam ▼ ]
```

The architecture should allow future categories to be added.

After selecting the category, the user should see a standardized metadata form.

---

# 8. Entry Metadata Structure

Each entry should support the following fields.

Not every field should be required.

```text
UNIQUE IDENTIFIER
Automatically generated by the application.
Allow manual editing if necessary.

TITLE
Example:
Quran 4:157

SOURCE
Example:
Quran

COLLECTION
Example:
The Quran
Sahih al-Bukhari
Sahih Muslim

BOOK / SURAH
Example:
Surah An-Nisa

CHAPTER
Optional

VERSE / AYAH / HADITH NUMBER
Optional

AUTHOR
Example:
Muhammad
Named scholar
Academic author

DATE
Optional

LANGUAGE
Example:
Arabic
English
Persian
Other

TYPE
Dropdown or selectable category.

Examples:
Primary Religious Text
Hadith
Commentary
Academic Paper
Book
Article
Personal Research
Historical Source

TEXT
The primary text or content of the entry.

TAGS
User-defined searchable keywords.

Example:
Jesus, crucifixion, Isa, Quran, Christian theology

RELATED ENTRIES
Allow the user to manually connect related entries.

PERSONAL NOTES
Allow the user to add their own thoughts, observations, arguments, questions, or conclusions.
```

---

# 9. Personal Notes

Personal Notes are important.

Each entry should contain a section:

```text
PERSONAL NOTES
```

The user should be able to write their own observations.

Example:

```text
This passage appears to be responding to a particular
Christian understanding of the crucifixion.
Compare with...
```

These notes must also be indexed by the search system.

Therefore, when the user searches:

```text
crucifixion
```

The application should be capable of returning:

* Quranic passages
* Hadith
* Scholarly work
* The user's personal notes

However, the UI should clearly distinguish personal notes from primary sources.

Personal notes must never be presented as though they are part of the original religious text.

---

# 10. File Upload System

The Add New Entry page should include file upload capability.

Initially support:

* PDF
* TXT
* Markdown
* DOCX, if practical
* PNG
* JPEG/JPG

Potentially support additional formats later.

The user should be able to:

```text
[ UPLOAD FILE ]
```

Possible workflow:

1. User uploads a file.
2. The application stores the original file locally.
3. If the file contains readable text, extract the text.
4. If the file is an image or scanned document, provide OCR capability where practical.
5. Allow the extracted text to be reviewed and edited.
6. Allow the user to fill out the metadata fields.
7. Submit the entry into the local database.

The original uploaded file should remain associated with the entry.

---

# 11. Submit New Entry

At the bottom of the entry form:

```text
[ CANCEL ]        [ SUBMIT NEW ENTRY ]
```

When submitted, the application should:

1. Generate or confirm the unique identifier.
2. Save the metadata.
3. Save the text.
4. Save the personal notes.
5. Save the original uploaded file, if applicable.
6. Index the content for keyword search.
7. Index the content for semantic search.
8. Make the entry immediately searchable.

---

# 12. Viewing an Entry

Clicking a search result should open a full entry page.

Example:

```text
Quran 4:157

CATEGORY
Islam

SOURCE
Quran

COLLECTION
The Quran

LANGUAGE
Arabic / English Translation

TEXT
────────────────────────

[Full stored text]

────────────────────────

TAGS

Jesus
Isa
Crucifixion

────────────────────────

PERSONAL NOTES

[User's notes]

────────────────────────

RELATED ENTRIES

[Entry 1]
[Entry 2]
[Entry 3]

────────────────────────

[ Open Original File ]
```

The user should be able to edit the entry later.

---

# 13. Supporting and Contradicting Material

The application should eventually help the user explore material that supports or conflicts with a particular idea.

However, the system must not independently invent theological conclusions.

The feature should operate as a retrieval tool.

After performing a search, provide options such as:

```text
[ SHOW RELATED MATERIAL ]

[ SHOW SUPPORTING MATERIAL ]

[ SHOW POTENTIALLY CONTRADICTING MATERIAL ]
```

The exact behavior should work as follows.

## Supporting Material

The application searches the Islam database for entries that appear relevant to or supportive of the search concept.

## Potentially Contradicting Material

The application searches the Islam database for entries that may express:

* A conflicting statement
* An opposing claim
* A contradictory interpretation
* Relevant material that challenges the apparent conclusion

The wording should preferably use:

```text
Potentially Contradicting Material
```

rather than automatically declaring that two passages objectively contradict each other.

The system should retrieve potentially conflicting material and allow the user to make the final determination.

This feature must remain based entirely on the user's stored data.

---

# 14. Search Filters

Filters should be implemented in a way that allows expansion later.

Initially, potential filters can include:

```text
SOURCE TYPE

☐ Quran
☐ Hadith
☐ Islamic Scholarly Work
☐ Personal Notes
```

Additional filters can be added later.

Examples:

* Specific Hadith collection
* Author
* Date
* Language
* Primary source
* Secondary source
* Academic paper
* Personal research

The user does not need every filter implemented immediately, but the underlying architecture should make them easy to add later.

---

# 15. Strict Data Boundary

This is an extremely important requirement.

The application must operate using the information stored by the user.

The search system should not supplement search results with:

* Internet information
* AI-generated research
* General language model knowledge
* External religious databases
* Unverified sources

If the user searches for something and the database does not contain relevant information, the application should indicate something similar to:

```text
No sufficiently relevant material was found in your current database.
```

It should not invent an answer.

---

# 16. Local and Private Operation

Version 1 is for private use only.

The application should run locally on the user's desktop computer.

The database and uploaded material should remain under the user's control.

The application should be designed so that it does not require:

* A public website
* User accounts
* Public registration
* A cloud database
* Sharing research with other users

Where possible, prioritize local storage.

The user may later decide to create:

* A public version
* A web version
* A mobile application

Therefore, the application's data architecture should be designed cleanly enough that future migration is possible.

---

# 17. Future Expansion Architecture

Although Version 1 contains only Islam, do not hard-code the system in a way that assumes Islam is the only possible category.

The database should conceptually support:

```text
RELIGION
    ↓
SOURCE GROUP
    ↓
COLLECTION
    ↓
ENTRY
```

For example:

```text
Islam
│
├── Quran
│
├── Hadith
│     ├── Sahih al-Bukhari
│     ├── Sahih Muslim
│     └── Other Collections
│
└── Islamic Scholarly Work
```

Later:

```text
Christianity
│
├── Bible
├── Apocrypha
├── Dead Sea Scrolls
├── Church Fathers
└── Christian Scholarly Work
```

The application should be expandable without requiring a complete rewrite.

---

# 18. Recommended Data Model

At minimum, design the application around entities similar to:

```text
ReligionCategory

SourceGroup

Collection

Entry

Attachment

PersonalNote

Tag

EntryRelationship
```

An Entry should be capable of belonging to:

```text
Religion Category
→ Islam

Source Group
→ Quran / Hadith / Scholarly Work

Collection
→ Optional

Entry
→ Individual searchable item
```

---

# 19. Search Architecture

The search engine should use a hybrid retrieval system.

The application should maintain:

### Traditional Search Index

For:

* Keywords
* Exact phrases
* Partial matches
* Metadata
* Tags

### Semantic Search Index

For:

* Meaning
* Concepts
* Related terminology
* Similar passages
* Conceptually relevant material

The search system should combine these results into a final ranked list.

The ranking should strongly reward exact phrase and exact keyword matches.

Conceptually:

```text
Final Search Score =
Exact Phrase Score
+ Exact Keyword Score
+ Metadata Score
+ Tag Score
+ Semantic Similarity Score
```

The exact mathematical formula can be adjusted during development.

---

# 20. Version 1 Priorities

Build the following first:

## Priority 1

A functional local desktop application.

## Priority 2

One religion category:

```text
Islam
```

## Priority 3

Source grouping:

```text
Quran
Hadith
Islamic Scholarly Work
Personal Notes
```

## Priority 4

Add New Entry functionality.

## Priority 5

Manual text entry.

## Priority 6

File upload.

## Priority 7

Local database storage.

## Priority 8

Hybrid search:

* Exact phrase search
* Keyword search
* Semantic search

## Priority 9

Ranked and grouped search results.

## Priority 10

Entry viewer and editor.

## Priority 11

Related material search.

## Priority 12

Potentially supporting and potentially contradicting material retrieval.

---

# 21. Do Not Build Yet

Do not spend significant development time on:

* Public accounts
* Multi-user collaboration
* Web hosting
* Payment systems
* Social features
* Public sharing
* AI-generated answers
* Internet research
* Automatic theological conclusions
* Mobile applications

The focus should be building a solid private research database and search engine first.

---

# 22. Future Mobile Compatibility

The current application only needs to function as a desktop application.

However, avoid designing the data layer in a way that permanently ties the information to one particular user interface.

Keep the following conceptually separated:

```text
USER INTERFACE
        ↓
APPLICATION LOGIC
        ↓
SEARCH ENGINE
        ↓
DATABASE
```

This will make it easier in the future to create:

* A mobile application
* A web application
* A public research platform

without completely rebuilding the underlying database and search architecture.

---

# 23. Primary Development Goal

The immediate goal is simple:

The user should be able to:

1. Open the desktop application.
2. Click **Islam**.
3. Add Islamic religious or scholarly material manually or through file upload.
4. Categorize that material.
5. Add personal notes.
6. Search using exact words or concepts.
7. Receive only relevant results from the Islam database.
8. See results grouped by Quran, Hadith, scholarly work, and personal notes.
9. Open the full source entry.
10. Explore related, supporting, and potentially contradicting material.

The application should function as a powerful, private, personally curated religious research library.

Do not add AI-generated answers. The system is currently intended to retrieve and organize the user's own research material only.
