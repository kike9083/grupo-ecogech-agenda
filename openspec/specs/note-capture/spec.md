# note-capture Specification

## Purpose

Capture dated/undated rich-text notes as first-class records, searchable by keyword.

## Requirements

### Requirement: Note creation

A note MUST be a record of type `note`, coexisting with `task`|`request`, owned by the creator, with an optional title (assumption: optional) and a rich-text body. Its `date` (`YYYY-MM-DD`) MUST be optional. An undated note MUST still be stored and listed.

#### Scenario: Dated note

- GIVEN an authenticated user
- WHEN a note with a future date is saved
- THEN it is stored as theirs and is eligible for calendar placement

#### Scenario: Undated note

- GIVEN an authenticated user
- WHEN a note without a date is saved
- THEN it is stored and listed, and excluded from the calendar

### Requirement: Rich-text body and sanitization

The note body MUST be authored as rich text, stored as HTML, and rendered sanitized so `<script>` tags and inline event handlers (`onerror`, etc.) are stripped. Malicious markup MUST NOT execute on render.

The authoring and rendering set MUST cover, at minimum: block styles (paragraph, three heading levels, monospaced), inline marks (bold, italic, underline, strikethrough, highlight, code, link), the three list types (bullet, ordered, checklist), tables, and inline images. What the editor can author MUST survive the sanitizer — an extension whose output the whitelist rejects would silently lose content on the next render.

Inline `style` MUST NOT be preserved, with one exception: a `color` declaration on `span`, which MUST match a closed value pattern (hex or an `rgb()`/`rgba()` triplet). Every other CSS property and every other tag MUST drop its style.

#### Scenario: Formatting round-trip

- GIVEN a note with bold/list/heading formatting
- WHEN it is saved and reopened
- THEN the formatted content renders equivalently

#### Scenario: Table round-trip

- GIVEN a note containing a table with a header row
- WHEN it is saved and reopened
- THEN the table structure and its cell text render equivalently

#### Scenario: Checklist round-trip

- GIVEN a note containing checklist items, some of them checked
- WHEN it is saved and reopened
- THEN every item keeps its text and its checked state

#### Scenario: Highlight round-trip

- GIVEN a note with a highlighted span
- WHEN it is saved and reopened
- THEN the highlight mark survives

#### Scenario: Text colour

- GIVEN a note body carrying `color` on a `span`
- WHEN it is rendered
- THEN the colour survives and no other declaration does

#### Scenario: XSS stripped

- GIVEN a note body containing `<script>` or an `onerror` attribute
- WHEN it is rendered
- THEN the script/handler is stripped and nothing executes

#### Scenario: Inline style cannot overlay the UI

- GIVEN a pasted element carrying `position:fixed` or a `url()` reference
- WHEN it is rendered
- THEN the declaration is dropped

### Requirement: Inline image contract

An inline image MUST be stored as an attachment of the note record and MUST be referenced by the relative path `/api/attachments/<fileId>`. The renderer MUST drop any `<img>` whose `src` is not exactly that shape: absolute URLs, protocol-relative URLs and `data:` URIs MUST NOT render.

Because the read proxy authorizes through the attachment document bound to the note, an image MUST NOT be attachable before the note exists. The authoring surface MUST state that condition in Spanish rather than failing silently.

#### Scenario: Uploaded image renders

- GIVEN an existing note
- WHEN an image is uploaded and inserted
- THEN it is stored as an attachment of that note and renders from the attachment path

#### Scenario: External image dropped

- GIVEN a note body containing an absolute URL, a protocol-relative URL or a `data:` URI as an image source
- WHEN it is rendered
- THEN the image is removed entirely

#### Scenario: No image before the note exists

- GIVEN a note that has not been saved yet
- WHEN the editor is shown
- THEN attaching an image is unavailable and the reason is stated in Spanish

### Requirement: Plain-text search index

The system MUST derive a plain-text representation of the note body and feed it into the existing fulltext `searchText`, so note text is findable by keyword. Text inside table cells and checklist items MUST be indexed exactly like paragraph text.

#### Scenario: Note found by keyword

- GIVEN A's note body contains "reunión"
- WHEN A searches that keyword
- THEN the note is returned

#### Scenario: Table and checklist text is indexed

- GIVEN a note whose body holds a keyword inside a table cell or a checklist item
- WHEN that keyword is searched
- THEN the note is returned

### Requirement: Empty body definition

A body MUST be treated as empty only when it carries neither text nor an image. A body holding only an image MUST be stored and rendered — it MUST NOT be normalized away.

#### Scenario: Image-only note survives

- GIVEN a note whose body contains only an inline image
- WHEN it is saved
- THEN the body is stored unchanged and the image renders

#### Scenario: Cleared editor

- GIVEN a document the user emptied (`<p></p>`)
- WHEN it is saved
- THEN the body is stored as the empty string and the empty state is shown

### Requirement: Creation timestamp display

A note MUST surface its `createdAt` in Spanish copy consistent with the app ("Anotado el …").

#### Scenario: Timestamp shown

- GIVEN a saved note
- WHEN it is displayed
- THEN its creation date is shown in Spanish

### Requirement: Note UI states

Note create/display MUST render loading, empty, and error states distinctly, with Spanish copy consistent with the existing app.

#### Scenario: Error

- GIVEN a failed save or load
- WHEN the note form/view renders
- THEN an error state with retry shows in Spanish
