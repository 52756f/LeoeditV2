// constants.js — Zentrale Anwendungskonstanten.
// Alle App-Metadaten und Konfigurationswerte an einem Ort.
// Getter-Syntax (get NAME()) statt einfacher Properties, damit die
// Werte unveränderlich sind (kein versehentliches Überschreiben).
export const APP_CONFIG = {
    get NAME() { return "Leoedit V2"; },
    get VERSION() { return "3.3.0.78"; },
    get HISTORY_LIMIT() { return 200; },       // Max. Undo-Schritte
    get DESCRIPTION() { return "Ein einfacher Texteditor<br>\n mit CodeMirror 6"; },
    get AUTHOR() { return "Leo Träxler"; },
    get COPYRIGHT() { return "© 2025 Leoedit. Alle Rechte vorbehalten"; },
    get DEFAULT_TAB_NAME() { return "Unbenannt.txt"; }  // Name für neue, leere Tabs
};

// Abwärtskompatibilität: Älterer Code referenziert diese Variablennamen
export const _APPNAME = APP_CONFIG.NAME;
export const HISTORY_LIMIT = APP_CONFIG.HISTORY_LIMIT;

// Statusleisten-Texte (deutsch)
export const STATUS_MESSAGES = {
    READY: "Bereit",
    CHANGED: "Geändert (Speichern erforderlich)",
    // ...
};