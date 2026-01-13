const { Plugin, Modal, Notice, PluginSettingTab, Setting } = require("obsidian");

const DEFAULT_SETTINGS = {
  defaultContent: "# {{tag}}",
  ignoreCase: false,
  lastFolderName: "tags"
};

// Utilidad de sanitización
class PathSanitizer {
  static sanitizeName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error("Nombre inválido");
    }

    // Eliminar caracteres peligrosos y espacios en blanco extra
    let sanitized = name.trim();
    
    // Bloquear path traversal
    if (sanitized.includes('..') || 
        sanitized.includes('./') || 
        sanitized.includes('.\\')) {
      throw new Error("Secuencia de path traversal detectada");
    }

    // Eliminar caracteres no permitidos (mantener solo alfanuméricos, guiones, espacios y algunos símbolos seguros)
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');
    
    // Eliminar barras al inicio y final
    sanitized = sanitized.replace(/^[\/\\]+|[\/\\]+$/g, '');
    
    // Normalizar barras múltiples
    sanitized = sanitized.replace(/[\/\\]+/g, '/');
    
    // Validar que no esté vacío después de sanitizar
    if (!sanitized || sanitized.trim().length === 0) {
      throw new Error("Nombre vacío después de sanitizar");
    }

    return sanitized;
  }

  static sanitizePath(basePath, ...parts) {
    try {
      // Sanitizar cada parte
      const sanitizedParts = parts.map(part => this.sanitizeName(part));
      
      // Construir path
      const fullPath = [basePath, ...sanitizedParts].join('/');
      
      // Validar que el path final no escape del base
      if (!fullPath.startsWith(basePath + '/') && fullPath !== basePath) {
        throw new Error("Path fuera del directorio base");
      }

      return fullPath;
    } catch (e) {
      throw new Error(`Path inválido: ${e.message}`);
    }
  }

  static sanitizeContent(content, allowedVars = ['tag']) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Escapar contenido HTML peligroso si es necesario
    // En Obsidian markdown esto es menos crítico, pero mantenemos control
    
    // Validar que solo use variables permitidas
    const varPattern = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(varPattern);
    
    for (const match of matches) {
      const varName = match[1];
      if (!allowedVars.includes(varName)) {
        throw new Error(`Variable no permitida: ${varName}`);
      }
    }

    return content;
  }

  static validateFolderName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error("Nombre de carpeta inválido");
    }

    const sanitized = name.trim();

    // Validar longitud
    if (sanitized.length === 0 || sanitized.length > 255) {
      throw new Error("Nombre de carpeta debe tener entre 1 y 255 caracteres");
    }

    // No permitir nombres reservados
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
    if (reserved.includes(sanitized.toUpperCase())) {
      throw new Error("Nombre de carpeta reservado por el sistema");
    }

    return this.sanitizeName(sanitized);
  }
}

class AutoTagFilesPlugin extends Plugin {
  async onload() {
    console.log("Plugin AUTO Tags cargado");
    await this.loadSettings();

    this.addRibbonIcon("file-plus", "Crear archivos", () => {
      new TagCreatorModal(this.app, this).open();
    });

    this.addCommand({
      id: "open-tag-creator",
      name: "Abrir creador de archivos",
      callback: () => {
        new TagCreatorModal(this.app, this).open();
      }
    });

    this.addSettingTab(new AutoTagsSettingTab(this.app, this));
  }

  async createFilesFromTags(folderName, tagsText) {
    try {
      // Sanitizar nombre de carpeta base
      const safeFolderName = PathSanitizer.validateFolderName(folderName);
      
      // Parsear líneas
      const lines = tagsText
        .split('\n')
        .map(l => l.replace(/\r/g, ''))
        .filter(l => l.trim().length > 0);
      
      if (lines.length === 0) {
        new Notice("No se encontraron nombres de archivos o carpetas");
        return;
      }

      // Validar número máximo de elementos
      if (lines.length > 1000) {
        new Notice("Máximo 1000 elementos por operación");
        return;
      }

      this.settings.lastFolderName = safeFolderName;
      await this.saveSettings();

      // Crear carpeta base
      try {
        await this.app.vault.createFolder(safeFolderName);
      } catch (e) {
        // Carpeta ya existe
      }

      let created = 0;
      let skipped = 0;
      let errors = 0;

      let currentStack = [safeFolderName];

      for (const rawLine of lines) {
        try {
          const leading = rawLine.match(/^\/+/);
          const depth = leading ? leading[0].length : 0;

          // Limitar profundidad
          if (depth > 10) {
            console.warn(`Profundidad excesiva ignorada: ${rawLine}`);
            errors++;
            continue;
          }

          let line = rawLine.slice(depth);
          const isFolder = line.endsWith('/');
          const name = isFolder ? line.slice(0, -1) : line;

          // Sanitizar nombre
          const safeName = PathSanitizer.sanitizeName(name);

          // Ajustar stack según profundidad
          currentStack = currentStack.slice(0, depth + 1);

          const parentPath = currentStack.join("/");
          
          // Construir path de forma segura
          const targetPath = PathSanitizer.sanitizePath(safeFolderName, 
            ...currentStack.slice(1), safeName);

          if (isFolder) {
            try {
              await this.app.vault.createFolder(targetPath);
              currentStack.push(safeName);
              created++;
            } catch {
              currentStack.push(safeName);
              skipped++;
            }
          } else {
            const filePath = `${targetPath}.md`;
            
            // Validar que el archivo esté dentro del vault
            if (!filePath.startsWith(safeFolderName + '/')) {
              console.warn(`Path inválido ignorado: ${filePath}`);
              errors++;
              continue;
            }

            if (!this.app.vault.getAbstractFileByPath(filePath)) {
              // Sanitizar contenido antes de usar
              const safeContent = PathSanitizer.sanitizeContent(
                this.settings.defaultContent, ['tag']
              );
              const content = safeContent.replace(/\{\{tag\}\}/g, safeName);
              
              await this.app.vault.create(filePath, content);
              created++;
            } else {
              skipped++;
            }
          }
        } catch (e) {
          console.error(`Error procesando línea "${rawLine}":`, e);
          errors++;
        }
      }

      if (created > 0) {
        new Notice(`${created} elemento(s) creado(s) en "${safeFolderName}"`);
      }
      if (skipped > 0) {
        new Notice(`${skipped} elemento(s) ya existían`);
      }
      if (errors > 0) {
        new Notice(`${errors} elemento(s) omitidos por errores de validación`);
      }
    } catch (e) {
      new Notice(`Error: ${e.message}`);
      console.error("Error en createFilesFromTags:", e);
    }
  }

  async deleteItem(path, isFolder) {
    try {
      // Validar que el path no intente escapar
      if (path.includes('..') || path.startsWith('/') || path.startsWith('\\')) {
        new Notice("Path inválido");
        return false;
      }

      const item = this.app.vault.getAbstractFileByPath(path);
      if (item) {
        await this.app.vault.delete(item, true);
        new Notice(`${isFolder ? 'Carpeta' : 'Archivo'} "${path}" eliminado`);
        return true;
      }
      return false;
    } catch (e) {
      new Notice(`Error al eliminar: ${e.message}`);
      console.error("Error en deleteItem:", e);
      return false;
    }
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    
    // Sanitizar configuración cargada
    try {
      this.settings.defaultContent = PathSanitizer.sanitizeContent(
        this.settings.defaultContent, ['tag']
      );
    } catch (e) {
      console.warn("Contenido por defecto inválido, usando predeterminado");
      this.settings.defaultContent = DEFAULT_SETTINGS.defaultContent;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class TagCreatorModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.currentTab = 'create';
    this.expandedFolders = new Set();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tag-creator-modal");

    const wrapper = contentEl.createDiv("tag-creator-wrapper");
    this.renderHeader(wrapper);
    this.renderContent(wrapper);
  }

  renderHeader(contentEl) {
    const header = contentEl.createDiv("tag-creator-header");
    
    header.createEl("h2", { 
      text: "Gestor de archivos",
      cls: "tag-creator-title"
    });

    const tabs = header.createDiv("tag-creator-tabs");

    const createTab = tabs.createEl("button", {
      text: "Crear",
      cls: `tag-creator-tab ${this.currentTab === 'create' ? 'active' : ''}`
    });

    const deleteTab = tabs.createEl("button", {
      text: "Eliminar",
      cls: `tag-creator-tab ${this.currentTab === 'delete' ? 'active' : ''}`
    });

    createTab.addEventListener("click", () => {
      this.currentTab = 'create';
      this.onOpen();
    });

    deleteTab.addEventListener("click", () => {
      this.currentTab = 'delete';
      this.onOpen();
    });
  }

  renderContent(contentEl) {
    const content = contentEl.createDiv("tag-creator-content");

    if (this.currentTab === 'create') {
      this.renderCreateTab(content);
    } else {
      this.renderDeleteTab(content);
    }
  }

  renderCreateTab(content) {
    const tabContent = content.createDiv("tag-creator-tab-content");

    tabContent.createEl("p", {
      text: "Escribe un nombre por línea. Usa / para subcarpetas y termina con / para crear solo carpeta",
      cls: "tag-creator-description"
    });

    const examplesBox = tabContent.createDiv("tag-creator-examples");
    examplesBox.createEl("div", {
      text: "Ejemplos:",
      cls: "tag-creator-examples-title"
    });
    const examplesList = examplesBox.createEl("ul", {
      cls: "tag-creator-examples-list"
    });
    examplesList.createEl("li").innerHTML = "<code>archivo1</code> → Archivo en raíz";
    examplesList.createEl("li").innerHTML = "<code>carpeta/</code> → Carpeta vacía";
    examplesList.createEl("li").innerHTML = "<code>carpeta/subcarpeta/</code> → Carpeta anidada";
    examplesList.createEl("li").innerHTML = "<code>carpeta/archivo2</code> → Archivo en subcarpeta";

    const folderContainer = tabContent.createDiv("tag-creator-folder");
    folderContainer.createEl("label", { 
      text: "Carpeta",
      cls: "tag-creator-label"
    });
    
    const folderInput = folderContainer.createEl("input", {
      type: "text",
      placeholder: "nombre-carpeta",
      value: this.plugin.settings.lastFolderName,
      cls: "tag-creator-input"
    });

    const tagsContainer = tabContent.createDiv("tag-creator-tags");
    tagsContainer.createEl("label", { 
      text: "Estructura",
      cls: "tag-creator-label"
    });

    const tagsInput = tagsContainer.createEl("textarea", {
      placeholder: "archivo1\ncarpeta/\ncarpeta/subcarpeta/\ncarpeta/archivo2",
      cls: "tag-creator-textarea"
    });

    const previewContainer = tabContent.createDiv("tag-creator-preview");
    const previewLabel = previewContainer.createEl("div", {
      text: "Vista previa: ",
      cls: "tag-creator-preview-label"
    });
    const previewContent = previewContainer.createEl("div", {
      cls: "tag-creator-preview-tree"
    });

    tagsInput.addEventListener("input", () => {
      const lines = tagsInput.value.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      previewContent.empty();
      if (lines.length > 0) {
        // Limitar preview
        const displayLines = lines.slice(0, 100);
        
        displayLines.forEach(line => {
          try {
            const isFolder = line.endsWith('/');
            const cleanName = isFolder ? line.slice(0, -1) : line;
            
            // Validar caracteres peligrosos en preview
            if (cleanName.includes('..') || /[<>:"|?*\x00-\x1F]/.test(cleanName)) {
              const item = previewContent.createEl("div", {
                cls: "tag-creator-preview-item error"
              });
              item.createEl("span", {
                text: `⚠️ Nombre inválido: ${line}`,
                cls: "tag-creator-preview-error"
              });
              return;
            }
            
            const depth = (cleanName.match(/\//g) || []).length;
            
            const item = previewContent.createEl("div", {
              cls: "tag-creator-preview-item"
            });
            item.style.paddingLeft = `${depth * 20}px`;
            
            const icon = item.createEl("span", {
              cls: "tag-creator-preview-icon"
            });
            
            if (isFolder) {
              icon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>`;
            } else {
              icon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>`;
            }
            
            // Escapar texto para prevenir XSS
            const displayName = this.escapeHtml(cleanName.split('/').pop() + (isFolder ? '/' : ''));
            item.createEl("span", {
              text: displayName,
              cls: "tag-creator-preview-name"
            });
          } catch (e) {
            console.error("Error en preview:", e);
          }
        });
        
        const totalText = lines.length > 100 ? 
          `${lines.length} elemento(s) (mostrando primeros 100)` : 
          `${lines.length} elemento(s)`;
        previewLabel.setText(`Vista previa: ${totalText}`);
      } else {
        previewLabel.setText("Vista previa: ");
        previewContent.createEl("span", {
          text: "Escribe la estructura",
          cls: "tag-creator-empty"
        });
      }
    });

    const buttonContainer = tabContent.createDiv("tag-creator-buttons");

    const createButton = buttonContainer.createEl("button", {
      text: "Crear",
      cls: "tag-creator-button primary"
    });

    const cancelButton = buttonContainer.createEl("button", {
      text: "Cancelar",
      cls: "tag-creator-button"
    });

    createButton.addEventListener("click", async () => {
      const folderName = folderInput.value.trim();
      const tagsText = tagsInput.value;

      if (!folderName) {
        new Notice("Debes especificar un nombre de carpeta");
        return;
      }

      await this.plugin.createFilesFromTags(folderName, tagsText);
      this.close();
    });

    cancelButton.addEventListener("click", () => {
      this.close();
    });

    tagsInput.focus();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderDeleteTab(content) {
    const tabContent = content.createDiv("tag-creator-tab-content");

    tabContent.createEl("p", {
      text: "Navega y elimina carpetas o archivos",
      cls: "tag-creator-description"
    });

    const treeContainer = tabContent.createDiv("tag-creator-tree");
    this.renderTree(treeContainer);
  }

  renderTree(container) {
    const root = this.app.vault.getRoot();
    this.renderTreeNode(container, root, 0);
  }

  renderTreeNode(container, file, level) {
    // Limitar profundidad para prevenir problemas de rendimiento
    if (level > 20) {
      return;
    }

    if (file.path === '/') {
      if (file.children) {
        file.children
          .sort((a, b) => {
            if (a.children && !b.children) return -1;
            if (!a.children && b.children) return 1;
            return a.name.localeCompare(b.name);
          })
          .forEach(child => {
            this.renderTreeNode(container, child, level);
          });
      }
      return;
    }

    const isFolder = !!file.children;
    const isExpanded = this.expandedFolders.has(file.path);

    const item = container.createDiv("tag-creator-tree-item");
    item.style.paddingLeft = `${level * 20}px`;

    const content = item.createDiv("tag-creator-tree-content");

    if (isFolder) {
      const toggleBtn = content.createEl("button", {
        cls: "tag-creator-tree-toggle"
      });
      
      toggleBtn.innerHTML = `<svg class="tree-arrow ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
      </svg>`;

      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isExpanded) {
          this.expandedFolders.delete(file.path);
        } else {
          this.expandedFolders.add(file.path);
        }
        this.onOpen();
      });
    } else {
      content.createEl("span", { 
        cls: "tag-creator-tree-toggle-spacer"
      });
    }

    const iconContainer = content.createEl("span", {
      cls: "tag-creator-tree-icon"
    });
    
    if (isFolder) {
      iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>`;
    } else {
      iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>`;
    }

    // Escapar nombre para prevenir XSS
    const name = content.createEl("span", {
      text: file.name,
      cls: "tag-creator-tree-name"
    });

    const deleteBtn = content.createEl("button", {
      cls: "tag-creator-tree-delete"
    });
    
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16">
      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>`;

    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const itemType = isFolder ? "carpeta" : "archivo";
      const confirmed = confirm(`¿Eliminar ${itemType} "${this.escapeHtml(file.path)}"${isFolder ? ' y todo su contenido' : ''}?`);
      
      if (confirmed) {
        const deleted = await this.plugin.deleteItem(file.path, isFolder);
        if (deleted) {
          this.expandedFolders.delete(file.path);
          this.onOpen();
        }
      }
    });

    if (isFolder && isExpanded && file.children) {
      file.children
        .sort((a, b) => {
          if (a.children && !b.children) return -1;
          if (!a.children && b.children) return 1;
          return a.name.localeCompare(b.name);
        })
        .forEach(child => {
          this.renderTreeNode(container, child, level + 1);
        });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class AutoTagsSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Configuración AUTO Tags" });

    new Setting(containerEl)
      .setName("Ignorar mayúsculas/minúsculas")
      .setDesc("Convertir nombres de archivos a minúsculas (#Idea → idea.md)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ignoreCase)
          .onChange(async (value) => {
            this.plugin.settings.ignoreCase = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Contenido por defecto")
      .setDesc("Plantilla para archivos nuevos. Usa {{tag}} para el nombre del tag")
      .addTextArea((text) =>
        text
          .setPlaceholder("# {{tag}}")
          .setValue(this.plugin.settings.defaultContent)
          .onChange(async (value) => {
            try {
              // Validar contenido antes de guardar
              PathSanitizer.sanitizeContent(value, ['tag']);
              this.plugin.settings.defaultContent = value;
              await this.plugin.saveSettings();
            } catch (e) {
              new Notice(`Error: ${e.message}`);
            }
          })
      );
  }
}

module.exports = AutoTagFilesPlugin;