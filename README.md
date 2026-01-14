# Auto Create Files - Obsidian Plugin

Plugin that allows creating complete file and folder structures in Obsidian using a simple text-based syntax.

## Key Features

- Bulk creation of files and folders from an intuitive interface
- Support for nested hierarchical structures
- Real-time preview of the structure to be created
- Visual manager for deleting files and folders
- Customizable templates for new files
- Protection against path traversal and injections

## Installation

1. Download the `main.js` and `manifest.json` files
2. Create a folder named `auto-tags` in `.obsidian/plugins/`
3. Place the downloaded files in this folder
4. Enable the plugin from Settings → Community plugins

## Basic Usage

### Creating Files and Folders

Access the manager through:
- The icon in the left sidebar
- The "Open file creator" command from the command palette (Ctrl/Cmd + P)

### Syntax

The syntax is simple and uses a one-line-per-element format:

```
file1
file2
folder/
folder/file-inside
folder/subfolder/
folder/subfolder/nested-file
```

#### Syntax Rules

**Simple Files**
```
note
document
ideas
```
Creates three `.md` files in the root folder: `note.md`, `document.md`, `ideas.md`

**Empty Folders**
```
projects/
resources/
```
Creates two empty folders. The trailing `/` indicates it's a folder.

**Nested Structures**
```
projects/
projects/client-a/
projects/client-a/proposal
projects/client-a/budget
projects/client-b/
projects/client-b/contract
```

**Prefix Slash Syntax**
```
/root-file
//folder/level-2-file
///folder/subfolder/level-3-file
```
Leading slashes indicate the nesting level. Useful for complex structures.

### Practical Examples

**Project Structure**
```
web-project/
web-project/planning
web-project/requirements
web-project/design/
web-project/design/wireframes
web-project/design/mockups
web-project/development/
web-project/development/frontend
web-project/development/backend
web-project/documentation
```

**Thematic Note System**
```
learning/
learning/programming/
learning/programming/javascript
learning/programming/python
learning/design/
learning/design/ui-ux
learning/design/typography
```

**Task Management by Context**
```
tasks/
tasks/work
tasks/personal
tasks/studies
archive/
archive/completed
archive/cancelled
```

## Preview

The interface displays a real-time preview of the structure to be created:

- Folder icons for directories
- File icons for documents
- Visual indentation based on nesting level
- Total element counter
- Invalid name validation

## Deletion Manager

The "Delete" tab provides a file browser where you can:

- View the complete structure of your vault
- Expand and collapse folders
- Delete individual files
- Delete complete folders with all their content
- Confirmation before deletion

## Configuration

Access the plugin settings from Settings → AUTO Tags.

### Available Options

**Ignore Case**

Automatically converts names to lowercase when creating files.

- Disabled: `Ideas.md`, `Project.md`
- Enabled: `ideas.md`, `project.md`

**Default Content**

Template to be applied to all new files created.

Use `{{tag}}` as a variable to insert the file name.

Examples:
```markdown
# {{tag}}

---
created: {{date}}
tags: 
---

```

```markdown
# {{tag}}

## Notes

## References
```

## Limits and Restrictions

For security and performance, the plugin implements the following limits:

- Maximum 1000 elements per operation
- Maximum 10 nesting levels in structures
- File names between 1 and 255 characters
- Forbidden characters: `< > : " | ? *`
- Path traversal sequences not allowed (`..`, `./`, `.\\`)
- System reserved names not allowed (CON, PRN, AUX, etc.)

## Use Cases

**Project Organization**

Quickly create the base structure of a new project with all its initial folders and files.

**Zettelkasten System**

Generate index files and categories for your linked note system.

**Knowledge Management**

Establish a complete taxonomy of topics with entry files for each one.

**Courses and Learning**

Create a folder structure by modules with files for each lesson.

**Resource Archive**

Organize resources by categories and subcategories with reference files.

## Troubleshooting

**Files Are Not Created**

Verify that the base folder name doesn't contain invalid characters and that no file with the same name already exists.

**Incorrect Structure**

Review the preview before creating. Make sure to use `/` at the end for folders and that indentation is correct.

**Skipped Elements**

The plugin will show a message with how many elements were skipped due to validation errors. Check the console for specific details.

**Excessive Depth Error**

Reduce nesting level to a maximum of 10 levels.

## Technical Notes

### Security

The plugin implements multiple validation layers:

- File and folder name sanitization
- Path validation to prevent path traversal
- HTML content escaping in the interface
- Template variable validation
- Depth and element quantity limits

### Compatibility

Compatible with Obsidian v1.11 and above. Tested on Windows, macOS, and Linux.

### Performance

For very large structures (more than 500 elements), creation may take a few seconds. The plugin processes elements sequentially to avoid conflicts.

## Contributing

If you find bugs or have suggestions, you can:

- Report issues with detailed problem description
- Include input examples that cause the error
- Specify your Obsidian version and operating system

## License

This plugin is free software. You can use, modify, and distribute it freely.

## Credits

Developed to simplify file structure creation in Obsidian.
