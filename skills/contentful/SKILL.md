---
name: contentful
description: Use when working with Contentful CMS -- adding fields, modifying content types, running migrations, querying content models, or any Contentful operations. Triggers on Contentful, content model, migration, or CMS mentions.
---

# Contentful CMS Operations

## ABSOLUTE SAFETY RULES -- NON-NEGOTIABLE

```
1. NEVER execute ANY operation on environments other than dev/develop
2. NEVER use delete, remove, or destructive commands
3. NEVER generate migration scripts containing delete/remove operations
4. ALWAYS require explicit user confirmation before ANY write operation
5. ALWAYS show preview/diff of changes before asking for confirmation
6. ALWAYS validate migration scripts for forbidden operations before showing to user
```

These rules cannot be overridden under any circumstances.

---

## Prerequisites

Check credentials and auto-configure if missing:

```bash
if ! security find-generic-password -s "tb.contentful-token" >/dev/null 2>&1; then
  echo "Contentful token not configured. Running setup..."
  node "${CLAUDE_SKILL_DIR}/setup.js"
fi
```

Get your management token from: Contentful Web App -> Settings -> CMA tokens -> Generate personal token.

## Required Flow for ALL Operations

### Step 1: Space Discovery

```bash
contentful space list
```

### Step 2: Detect Space from Project

Look for space ID in these locations (in order):
1. `.env` files -- look for `CONTENTFUL_SPACE_ID` or similar
2. `.contentfulrc` or `.contentfulrc.json`
3. `contentful.json` or `contentful-config.json`
4. GraphQL codegen config files (`.graphqlrc.*`)
5. `package.json` scripts referencing space IDs

### Step 3: Environment Discovery

```bash
contentful space environment list --space-id <SPACE_ID>
```

### Step 4: Find and Verify Development Environment

- Search for environment named `develop` or `dev` in the list
- Common dev environment names: `develop`, `dev`, `development`
- If none found, ASK user which environment is the development environment
- REFUSE to proceed if user tries to specify production/master/staging

### Step 5: Confirm with User

Always show this confirmation and WAIT for user to type "yes":

```
CONTENTFUL OPERATION CONFIRMATION
Space:       <SPACE_NAME> (<SPACE_ID>)
Environment: develop

Is this correct? Type "yes" to confirm:
```

Do NOT proceed unless user types exactly "yes".

---

## CLI Reference (Read Operations)

### Spaces

```bash
contentful space list
contentful space use --space-id <ID>
```

### Environments

```bash
contentful space environment list --space-id <SPACE_ID>
```

### Content Types

```bash
contentful content-type list --space-id <SPACE_ID> -e develop
contentful content-type get --space-id <SPACE_ID> -e develop --id <CONTENT_TYPE_ID>
```

### Export (Query Entries)

```bash
contentful space export --space-id <SPACE_ID> --environment-id develop \
  --content-only \
  --content-file /tmp/output.json \
  --query-entries "content_type=webLandingPage" \
  --query-assets "sys.id=impossible"
```

Parse exported JSON (fields are nested by locale):

```bash
cat /tmp/output.json | jq '.entries[] | {title: .fields.title["en-GB"], slug: .fields.slug["en-GB"]}'
```

### Config

```bash
contentful config list
```

---

## Authentication

### CLI Flag Differences

| CLI Tool | Auth Flag | Alias |
|----------|-----------|-------|
| `contentful` (main CLI) | `--management-token` | `--mt` |
| `contentful-migration` | `--access-token` | `-a` |

These are DIFFERENT flags for the SAME token (Management API token). Do NOT use `--management-token` with `contentful-migration` or `--access-token` with `contentful` -- they will fail.

### Passing Token from Keychain

For the main CLI:

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
MT=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.contentful-token)
contentful content-type list --space-id <SPACE_ID> -e develop --mt "$MT"
```

For contentful-migration:

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
MT=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.contentful-token)
npx contentful-migration --space-id <SPACE_ID> --environment-id develop -a "$MT" path/to/migration.js
```

---

## Running Migrations

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
MT=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.contentful-token)
npx contentful-migration \
  --space-id <SPACE_ID> \
  --environment-id develop \
  -a "$MT" \
  <path-to-migration-file.js>
```

ALWAYS use `--environment-id develop` -- NEVER omit this flag (defaults to master/production).

### Migration CLI Options

| Option | Description |
|--------|-------------|
| `--space-id, -s` | Space ID (required) |
| `-e, --environment-id` | Environment ID (default: "master") -- ALWAYS set to develop |
| `-a, --access-token` | Management API token |
| `-y, --yes` | Skip confirmation prompts |
| `-q, --quiet` | Reduce verbosity |
| `-l, --request-batch-size` | Batch size (default: 100) |
| `-r, --request-limit` | Max requests/sec (default: 10) |

### Migration Files

Migration scripts are typically throwaway -- write to `/tmp/`, execute, then discard. Do NOT commit migration files to the repo unless the user explicitly requests it.

1. Write to `/tmp/contentful-migration-<description>.js`
2. Execute it
3. Do NOT add to git

---

## Migration DSL Reference

### Content Type Operations

```javascript
migration.createContentType("blogPost", {
  name: "Blog Post",
  description: "A blog post entry",
  displayField: "title"
});

const contentType = migration.editContentType("blogPost");
```

### Field Operations

```javascript
const contentType = migration.editContentType("blogPost");

contentType
  .createField("fieldId")
  .name("Field Name")
  .type("Symbol")
  .required(false)
  .localized(false)
  .disabled(false)
  .omitted(false)
  .validations([])
  .defaultValue({ "en-US": "default" });

contentType
  .editField("fieldId")
  .name("New Name")
  .required(true);

contentType.changeFieldId("oldId", "newId");

contentType.moveField("fieldId").toTheTop();
contentType.moveField("fieldId").toTheBottom();
contentType.moveField("fieldId").beforeField("otherFieldId");
contentType.moveField("fieldId").afterField("otherFieldId");
```

### All Field Types

| Type | Description | Max Size | Example Use |
|------|-------------|----------|-------------|
| `Symbol` | Short text | 256 chars | Titles, slugs, IDs |
| `Text` | Long text | 50,000 chars | Descriptions, markdown |
| `RichText` | Formatted text | 200,000 chars / 1MB | Article content |
| `Integer` | Whole numbers | -2^53 to 2^53 | Counts, order |
| `Number` | Decimal numbers | -2^53 to 2^53 | Prices, ratings |
| `Date` | ISO 8601 date/time | - | Publish dates |
| `Boolean` | True/false | - | Toggles, flags |
| `Object` | JSON object | - | Custom data |
| `Location` | Lat/long | - | Maps, geolocation |
| `Array` | List of items | - | Tags, multi-ref |
| `Link` | Reference | - | Related content |
| `ResourceLink` | Cross-space ref | - | External content |

### Array Field Configuration

```javascript
contentType
  .createField("tags")
  .name("Tags")
  .type("Array")
  .items({
    type: "Symbol",
    validations: [{ in: ["news", "sports", "culture"] }]
  });

contentType
  .createField("relatedPosts")
  .name("Related Posts")
  .type("Array")
  .items({
    type: "Link",
    linkType: "Entry",
    validations: [{ linkContentType: ["blogPost"] }]
  });
```

### Link Field Configuration

```javascript
contentType
  .createField("author")
  .name("Author")
  .type("Link")
  .linkType("Entry")
  .validations([{ linkContentType: ["person"] }]);

contentType
  .createField("featuredImage")
  .name("Featured Image")
  .type("Link")
  .linkType("Asset")
  .validations([{ linkMimetypeGroup: ["image"] }]);
```

### All Validation Types

```javascript
{ size: { min: 1, max: 256 } }
{ regexp: { pattern: "^[a-z0-9-]+$", flags: "i" } }
{ in: ["option1", "option2", "option3"] }
{ unique: true }
{ dateRange: { min: "2020-01-01", max: "2030-12-31" } }
{ range: { min: 0, max: 100 } }
{ linkContentType: ["blogPost", "article"] }
{ assetFileSize: { min: 0, max: 1048576 } }
{ assetImageDimensions: { width: { min: 100, max: 2000 }, height: { min: 100, max: 2000 } } }
{ linkMimetypeGroup: ["image", "video", "audio", "document", "archive", "code", "markup"] }
{ prohibitRegexp: { pattern: "<script" } }
{ nodes: { "embedded-entry-block": [{ linkContentType: ["codeBlock"] }] } }
{ enabledMarks: ["bold", "italic", "underline", "code"] }
{ enabledNodeTypes: ["heading-1", "heading-2", "blockquote", "ordered-list", "unordered-list"] }
```

### Field Controls (Editor Interface)

```javascript
contentType.changeFieldControl(
  "fieldId",
  "builtin",
  "singleLine",
  { helpText: "Enter value" }
);

contentType.resetFieldControl("fieldId");
contentType.copyFieldControl("sourceFieldId", "targetFieldId");
```

### Built-in Widget IDs

| Widget ID | For Field Types | Description |
|-----------|----------------|-------------|
| `singleLine` | Symbol | Single line text input |
| `urlEditor` | Symbol | URL input with validation |
| `slugEditor` | Symbol | Slug generator |
| `dropdown` | Symbol | Dropdown select |
| `radio` | Symbol | Radio buttons |
| `tagEditor` | Array[Symbol] | Tag input |
| `markdown` | Text | Markdown editor |
| `multipleLine` | Text | Multiline textarea |
| `richTextEditor` | RichText | Rich text editor |
| `numberEditor` | Integer, Number | Number input |
| `rating` | Integer, Number | Star rating |
| `boolean` | Boolean | Toggle switch |
| `datePicker` | Date | Date/time picker |
| `locationEditor` | Location | Map picker |
| `objectEditor` | Object | JSON editor |
| `entryLinkEditor` | Link[Entry] | Entry picker |
| `entryLinksEditor` | Array[Link] | Multiple entry picker |
| `assetLinkEditor` | Link[Asset] | Asset picker |
| `assetLinksEditor` | Array[Link] | Multiple asset picker |

### Widget Settings

```javascript
{
  helpText: "Help text shown below field",
  trueLabel: "Yes",
  falseLabel: "No",
  stars: 5,
  format: "dateonly",
  ampm: "12",
  bulkEditing: true,
  showCreateEntityAction: true,
  showLinkEntityAction: true
}
```

---

## Transform Operations

### Transform Entry Values

```javascript
migration.transformEntries({
  contentType: "blogPost",
  from: ["title", "body"],
  to: ["slug", "excerpt"],
  transformEntryForLocale: function(fromFields, currentLocale) {
    const title = fromFields.title?.[currentLocale] || "";
    const body = fromFields.body?.[currentLocale] || "";
    return {
      slug: title.toLowerCase().replace(/\s+/g, "-"),
      excerpt: body.substring(0, 150)
    };
  },
  shouldPublish: "preserve"
});
```

### Derive Linked Entries

```javascript
migration.deriveLinkedEntries({
  contentType: "blogPost",
  derivedContentType: "author",
  from: ["authorName", "authorBio"],
  toReferenceField: "author",
  derivedFields: ["name", "bio"],
  identityKey: async (fromFields) => {
    return fromFields.authorName?.["en-US"]?.toLowerCase();
  },
  deriveEntryForLocale: async (fromFields, currentLocale) => {
    return {
      name: fromFields.authorName?.[currentLocale],
      bio: fromFields.authorBio?.[currentLocale]
    };
  }
});
```

### Transform Entries to Different Type

```javascript
migration.transformEntriesToType({
  sourceContentType: "legacyPost",
  targetContentType: "blogPost",
  from: ["oldTitle"],
  identityKey: async (fields) => fields.oldTitle?.["en-US"],
  transformEntryForLocale: async (fromFields, currentLocale) => {
    return {
      title: fromFields.oldTitle?.[currentLocale]
    };
  },
  shouldPublish: true,
  updateReferences: true
});
```

---

## Editor Layout Operations

```javascript
const contentType = migration.editContentType("blogPost");

contentType.createEditorLayout();

contentType.createFieldGroup("content", { name: "Content" });
contentType.createFieldGroup("metadata", { name: "Metadata" });

contentType.moveField("title").toTheTopOfFieldGroup("content");
contentType.moveField("body").toTheBottomOfFieldGroup("content");
contentType.moveField("publishDate").toTheTopOfFieldGroup("metadata");

contentType.changeFieldGroupControl(
  "content",
  "builtin",
  "fieldset",
  { collapsedByDefault: false }
);
```

---

## Tag Operations

```javascript
migration.createTag("featured", {
  name: "Featured",
  visibility: "public"
});

migration.editTag("featured", { name: "Featured Content" });

migration.setTagsForEntries({
  contentType: "blogPost",
  from: ["category"],
  setTagsForEntry: (fields) => {
    if (fields.category?.["en-US"] === "featured") {
      return [{ sys: { id: "featured", type: "Tag" } }];
    }
    return [];
  }
});
```

---

## Sidebar and Entry Editor

```javascript
const contentType = migration.editContentType("blogPost");

contentType.addSidebarWidget(
  "sidebar-builtin",
  "publication-widget",
  { helpText: "Publishing options" },
  "before-widget-id"
);

contentType.updateSidebarWidget(
  "sidebar-builtin",
  "publication-widget",
  { helpText: "Updated help text" }
);

contentType.configureEntryEditor("builtin", "default", {
  helpText: "Edit your blog post"
});

contentType.resetSidebarToDefault();
contentType.resetEntryEditorToDefault();
```

---

## Pre-Execution Validation

Before showing ANY migration script to the user, validate it:

```javascript
const forbiddenPatterns = [
  /\.deleteField\s*\(/,
  /\.deleteContentType\s*\(/,
  /migration\.deleteContentType/,
  /\.deleteTag\s*\(/,
  /\.deleteEditorLayout\s*\(/,
  /\.deleteFieldGroup\s*\(/,
  /removeSidebarWidget/,
  /removeOldEntries:\s*true/,
];
```

If ANY forbidden pattern is found:
1. Do NOT show the script to user
2. Do NOT offer to modify it
3. REFUSE the operation entirely
4. Explain that destructive operations are not allowed

---

## Write Operation Flow

Before ANY write operation:

1. **Validate** -- check migration script for forbidden operations
2. **Preview** -- show exactly what will change:

```
MIGRATION PREVIEW
Content Type: <content_type_id>
Operation:    <ADD FIELD / EDIT FIELD / etc.>

<details of the change>

Migration Script:
<the script content>

This will be executed on:
  Space:       <SPACE_NAME>
  Environment: develop

Type "yes" to execute this migration:
```

3. **Wait for "yes"** -- do NOT proceed without explicit confirmation
4. **Execute** -- run the migration with `--environment-id develop`
5. **Verify** -- show the updated content type to confirm changes applied

---

## Allowed Operations

- `contentful space list`
- `contentful space environment list --space-id X`
- `contentful content-type list --space-id X -e develop`
- `contentful content-type get --space-id X -e develop --id Y`
- `contentful space export --space-id X --environment-id develop --query-entries "content_type=Y"`
- `npx contentful-migration --space-id X --environment-id develop <file>`
- `createContentType`, `editContentType`
- `createField`, `editField`, `changeFieldId`, `moveField`
- `changeFieldControl`, `resetFieldControl`, `copyFieldControl`
- `transformEntries`, `deriveLinkedEntries`
- `createTag`, `editTag`, `setTagsForEntries`
- `createEditorLayout`, `editEditorLayout`
- `createFieldGroup`, `editFieldGroup`, `changeFieldGroupId`
- `addSidebarWidget`, `updateSidebarWidget`
- `configureEntryEditor`, `configureEntryEditors`

## NEVER Use

- `deleteContentType`
- `deleteField`
- `deleteTag`
- `deleteEditorLayout`
- `deleteFieldGroup`
- `removeSidebarWidget`
- `removeOldEntries: true`
- Any operation on non-develop environments
- Any operation without user confirmation
