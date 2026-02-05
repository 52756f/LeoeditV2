# Project Explorer Module Design

## Overview

Add a second file explorer ("ProjectExplorer") that shows only files within a selected project folder. The project is defined by a `.leoedit.json` config file in the project root.

## Project Config File

Location: `<project-root>/.leoedit.json`

```json
{
  "name": "My Project",
  "rootPath": "/home/franz/projects/myapp",
  "version": "1.0",
  "created": "2026-02-04T10:30:00Z",
  "lastOpened": "2026-02-04T14:20:00Z"
}
```

Extensible for future settings (build commands, excluded folders, etc.).

## UI Design

Sidebar toggles between two views via toolbar buttons:

- **Explorer (existing)**: Free filesystem navigation
- **Project (new)**: Locked to project root

```
┌─────────────────────────┐
│ [📁] [📦]               │  ← Toggle buttons
├─────────────────────────┤
│ ▲  .../myproject        │  ← "Up" disabled at project root
├─────────────────────────┤
│ 📁 src/                 │
│ 📁 tests/               │
│ 📄 package.json         │
└─────────────────────────┘
```

When no project is open, shows "Open Project" / "New Project" buttons.

## Backend (Go)

### New file: `project.go`

```go
type ProjectConfig struct {
    Name       string `json:"name"`
    RootPath   string `json:"rootPath"`
    Version    string `json:"version"`
    Created    string `json:"created"`
    LastOpened string `json:"lastOpened"`
}

func (a *App) CreateProject(folderPath, projectName string) (*ProjectConfig, error)
func (a *App) OpenProject(folderPath string) (*ProjectConfig, error)
func (a *App) SelectProjectFolder() (string, error)
func (a *App) ListProjectDirectory(path, projectRoot string) (*DirectoryResult, error)
```

`ListProjectDirectory` validates path is within projectRoot for security.

## Frontend

### New file: `clsProjectExplorer.js`

```javascript
export class ProjectExplorer {
    constructor(container, options)
    async openProject(folderPath)
    async createProject(folderPath, name)
    async navigate(path)
    navigateUp()
    render()
    renderNoProject()
    show() / hide() / toggle()
    isProjectOpen()
    getProjectName()
}
```

### Modifications

- `clsLeftToolbar.js`: Add Project button
- `main.js`: Create ProjectExplorer, wire toggle between explorers

## Implementation Order

1. `project.go` - Backend functions
2. `clsProjectExplorer.js` - Frontend component
3. `clsLeftToolbar.js` - Add toggle button
4. `main.js` - Wire everything together
5. CSS styling (reuse fileexplorer.css patterns)
