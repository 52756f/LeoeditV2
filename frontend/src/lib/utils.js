// utils.js — Allgemeine Hilfsfunktionen.

// escapeHtml verhindert XSS-Angriffe durch Escaping von HTML-Sonderzeichen.
// Wird verwendet, wenn Benutzerdaten (z.B. Dateinamen) in HTML eingefügt werden.
export function escapeHtml(str) {
    if (!str) return '';
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
}

// generateUUID erzeugt eine zufällige UUID v4.
// Format: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
// Die "4" kennzeichnet UUID-Version 4, "y" ist auf 8/9/a/b beschränkt.
// Wird für eindeutige Tab-IDs verwendet.
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// getFilenameFromPath extrahiert den Dateinamen aus einem vollständigen Pfad.
// Funktioniert mit "/" (Linux/Mac) und "\" (Windows).
// Beispiel: "/home/user/datei.txt" → "datei.txt"
export function getFilenameFromPath(path) {
  if (!path) return '';
  return path.replace(/^.*[\\/]/, '');
}

// Prüft ob eine Datei ein Bild ist (anhand der Erweiterung).
// Wird verwendet, um zu entscheiden ob ReadBinaryFile statt ReadTextFile
// aufgerufen werden soll.
export function isImageExtension(filename) {
    if (!filename) return false;
    const imageExtensions = new Set([
        'jpg', 'jpeg', 'jpe', 'jfif', 'jif',
        'png', 'gif', 'bmp', 'webp', 'tiff', 'tif',
        'ico', 'cur', 'svg', 'svgz'
    ]);
    const ext = filename.split('.').pop().toLowerCase();
    return imageExtensions.has(ext);
}

// Hilfsfunktion: Prüft ob eine Datei ein PDF ist (anhand der Erweiterung)
export function isPdfExtension(filename) {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ext === 'pdf';
}

// getFileType bestimmt den Dateityp anhand der Dateiendung.
// Der Rückgabewert wird für zwei Zwecke genutzt:
//   1. Auswahl der CodeMirror-Spracherweiterung (Syntax-Highlighting)
//   2. Entscheidung ob Text- oder Binärmodus (image/pdf → ReadBinaryFile)
// WICHTIG: Diese Map muss mit getLanguageExtension() in editor.js synchron sein!
export function getFileType(filename) {
  if (!filename) return 'text';

  const ext = filename.split('.').pop().toLowerCase();

  const typeMap = {
    // Code/Text Dateien
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'javascript', // oder 'typescript'
    'tsx': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'html': 'html',
    'htm': 'html',
    'xhtml': 'html',
    'css': 'css',
    'scss': 'css',
    'sass': 'css',
    'less': 'css',
    'json': 'json',
    'json5': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',

    // Programmiersprachen
    'py': 'python',
    'pyw': 'python',
    'pyc': 'python',
    'pyo': 'python',
    'md': 'markdown',
    'markdown': 'markdown',
    'mdown': 'markdown',
    'txt': 'text',
    'rtf': 'text',
    'log': 'text',
    'go': 'go',
    'java': 'java',
    'class': 'java',
    'jar': 'java',
    'cpp': 'cpp',
    'vala': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'c++': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'hxx': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'php3': 'php',
    'php4': 'php',
    'php5': 'php',
    'phtml': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'rs': 'rust',
    'lua': 'lua',
    'pl': 'perl',
    'pm': 'perl',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'bash',
    'bat': 'batch',
    'cmd': 'batch',
    'ps1': 'powershell',
    'sql': 'sql',
    'r': 'r',
    'm': 'matlab',
    'f': 'fortran',
    'f90': 'fortran',
    'f95': 'fortran',

    // Bild-Dateien (wichtig für deine Frage!)
    'jpg': 'image',
    'jpeg': 'image',
    'jfif': 'image',
    'pjpeg': 'image',
    'pjp': 'image',
    'png': 'image',
    'gif': 'image',
    'bmp': 'image',
    'ico': 'image',
    'svg': 'image',
    'svgz': 'image',
    'webp': 'image',
    'tiff': 'image',
    'tif': 'image',
    'psd': 'image',
    'ai': 'image',
    'eps': 'image',
    'raw': 'image',
    'cr2': 'image',
    'nef': 'image',
    'orf': 'image',
    'sr2': 'image',

    // Medien-Dateien
    'mp3': 'audio',
    'wav': 'audio',
    'ogg': 'audio',
    'flac': 'audio',
    'aac': 'audio',
    'm4a': 'audio',
    'wma': 'audio',
    'mp4': 'video',
    'avi': 'video',
    'mov': 'video',
    'wmv': 'video',
    'flv': 'video',
    'mkv': 'video',
    'webm': 'video',
    'mpeg': 'video',
    'mpg': 'video',

    // Dokumente
    'pdf': 'pdf',
    'doc': 'document',
    'docx': 'document',
    'xls': 'document',
    'xlsx': 'document',
    'ppt': 'document',
    'pptx': 'document',
    'odt': 'document',
    'ods': 'document',
    'odp': 'document',
    'rtf': 'document',

    // Archive/Komprimierte Dateien
    'zip': 'archive',
    'rar': 'archive',
    '7z': 'archive',
    'tar': 'archive',
    'gz': 'archive',
    'bz2': 'archive',
    'xz': 'archive',

    // Web/Netzwerk
    'csv': 'csv',
    'tsv': 'csv',
    // SVG bereits oben als 'image' definiert (Zeile 155-156)

    // Datenbank
    'db': 'database',
    'sqlite': 'database',
    'sqlite3': 'database',
    'mdb': 'database',

    // Einstellungen/Konfiguration
    'env': 'config',
    'properties': 'config',

    // Ausführbare Dateien
    'exe': 'binary',
    'dll': 'binary',
    'so': 'binary',
    'dylib': 'binary',

    // Fonts
    'ttf': 'font',
    'otf': 'font',
    'woff': 'font',
    'woff2': 'font',
    'eot': 'font'
  };

  // Spezielle Logik für bestimmte Fälle
  if (ext === 'ts' || ext === 'tsx') {
    // Optional: TypeScript separat behandeln
    // return 'typescript';
  }

  return typeMap[ext] || 'text';
}