# AUTO Tags - Plugin para Obsidian

Plugin que permite crear estructuras completas de archivos y carpetas en Obsidian mediante una sintaxis simple basada en texto.

## Características principales

- Creación masiva de archivos y carpetas desde una interfaz intuitiva
- Soporte para estructuras jerárquicas anidadas
- Vista previa en tiempo real de la estructura a crear
- Gestor visual para eliminar archivos y carpetas
- Plantillas personalizables para archivos nuevos
- Protección contra path traversal e inyecciones

## Instalación

1. Descarga el archivo `main.js` y `manifest.json`
2. Crea una carpeta llamada `auto-tags` en `.obsidian/plugins/`
3. Coloca los archivos descargados en esta carpeta
4. Activa el plugin desde Configuración → Plugins de comunidad

## Uso básico

### Crear archivos y carpetas

Accede al gestor mediante:
- El icono en la barra lateral izquierda
- El comando "Abrir creador de archivos" desde la paleta de comandos (Ctrl/Cmd + P)

### Sintaxis

La sintaxis es simple y utiliza un formato de una línea por elemento:

```
archivo1
archivo2
carpeta/
carpeta/archivo-dentro
carpeta/subcarpeta/
carpeta/subcarpeta/archivo-anidado
```

#### Reglas de sintaxis

**Archivos simples**
```
nota
documento
ideas
```
Crea tres archivos `.md` en la carpeta raíz: `nota.md`, `documento.md`, `ideas.md`

**Carpetas vacías**
```
proyectos/
recursos/
```
Crea dos carpetas vacías. El carácter `/` al final indica que es una carpeta.

**Estructuras anidadas**
```
proyectos/
proyectos/cliente-a/
proyectos/cliente-a/propuesta
proyectos/cliente-a/presupuesto
proyectos/cliente-b/
proyectos/cliente-b/contrato
```

**Sintaxis con barras adelante (prefijo)**
```
/archivo-raiz
//carpeta/archivo-nivel-2
///carpeta/subcarpeta/archivo-nivel-3
```
Las barras al inicio indican el nivel de anidamiento. Útil para estructuras complejas.

### Ejemplos prácticos

**Estructura de proyecto**
```
proyecto-web/
proyecto-web/planificacion
proyecto-web/requisitos
proyecto-web/diseno/
proyecto-web/diseno/wireframes
proyecto-web/diseno/mockups
proyecto-web/desarrollo/
proyecto-web/desarrollo/frontend
proyecto-web/desarrollo/backend
proyecto-web/documentacion
```

**Sistema de notas temáticas**
```
aprendizaje/
aprendizaje/programacion/
aprendizaje/programacion/javascript
aprendizaje/programacion/python
aprendizaje/diseno/
aprendizaje/diseno/ui-ux
aprendizaje/diseno/tipografia
```

**Gestión de tareas por contexto**
```
tareas/
tareas/trabajo
tareas/personal
tareas/estudios
archivo/
archivo/completadas
archivo/canceladas
```

## Vista previa

La interfaz muestra una vista previa en tiempo real de la estructura que se creará:

- Iconos de carpeta para directorios
- Iconos de archivo para documentos
- Indentación visual según el nivel de anidamiento
- Contador de elementos totales
- Validación de nombres inválidos

## Gestor de eliminación

La pestaña "Eliminar" proporciona un navegador de archivos donde puedes:

- Ver la estructura completa de tu vault
- Expandir y colapsar carpetas
- Eliminar archivos individuales
- Eliminar carpetas completas con todo su contenido
- Confirmación antes de eliminar

## Configuración

Accede a la configuración del plugin desde Configuración → AUTO Tags.

### Opciones disponibles

**Ignorar mayúsculas/minúsculas**

Convierte automáticamente los nombres a minúsculas al crear archivos.

- Desactivado: `Ideas.md`, `Proyecto.md`
- Activado: `ideas.md`, `proyecto.md`

**Contenido por defecto**

Plantilla que se aplicará a todos los archivos nuevos creados.

Usa `{{tag}}` como variable para insertar el nombre del archivo.

Ejemplos:
```markdown
# {{tag}}

---
created: {{date}}
tags: 
---

```

```markdown
# {{tag}}

## Notas

## Referencias
```

## Límites y restricciones

Por seguridad y rendimiento, el plugin implementa los siguientes límites:

- Máximo 1000 elementos por operación
- Máximo 10 niveles de profundidad en estructuras anidadas
- Nombres de archivo entre 1 y 255 caracteres
- Caracteres prohibidos: `< > : " | ? *`
- No se permiten secuencias de path traversal (`..`, `./`, `.\\`)
- No se permiten nombres reservados del sistema (CON, PRN, AUX, etc.)

## Casos de uso

**Organización de proyectos**

Crea rápidamente la estructura base de un nuevo proyecto con todas sus carpetas y archivos iniciales.

**Sistema Zettelkasten**

Genera archivos de índice y categorías para tu sistema de notas enlazadas.

**Gestión de conocimiento**

Establece una taxonomía completa de temas con archivos de entrada para cada uno.

**Cursos y aprendizaje**

Crea una estructura de carpetas por módulos con archivos para cada lección.

**Archivo de recursos**

Organiza recursos por categorías y subcategorías con archivos de referencia.

## Solución de problemas

**Los archivos no se crean**

Verifica que el nombre de la carpeta base no contenga caracteres inválidos y que no exista ya un archivo con el mismo nombre.

**Estructura incorrecta**

Revisa la vista previa antes de crear. Asegúrate de usar `/` al final para carpetas y que la indentación sea correcta.

**Elementos omitidos**

El plugin mostrará un mensaje con cuántos elementos fueron omitidos por errores de validación. Revisa la consola para ver detalles específicos.

**Error de profundidad excesiva**

Reduce el nivel de anidamiento a un máximo de 10 niveles.

## Notas técnicas

### Seguridad

El plugin implementa múltiples capas de validación:

- Sanitización de nombres de archivos y carpetas
- Validación de paths para prevenir path traversal
- Escape de contenido HTML en la interfaz
- Validación de variables en plantillas
- Límites de profundidad y cantidad de elementos

### Compatibilidad

Compatible con Obsidian v1.0.0 en adelante. Probado en Windows, macOS y Linux.

### Rendimiento

Para estructuras muy grandes (más de 500 elementos), la creación puede tomar algunos segundos. El plugin procesa los elementos de forma secuencial para evitar conflictos.

## Contribución

Si encuentras bugs o tienes sugerencias, puedes:

- Reportar issues con descripción detallada del problema
- Incluir ejemplos de entrada que causan el error
- Especificar tu versión de Obsidian y sistema operativo

## Licencia

Este plugin es software libre. Puedes usarlo, modificarlo y distribuirlo libremente.

## Créditos

Desarrollado para simplificar la creación de estructuras de archivos en Obsidian.
