// tab.js — Reines Datenmodell für einen Editor-Tab.
// Enthält keine UI-Logik — nur die Daten, die einen Tab beschreiben.
// Die UI-Darstellung wird von TabView (tabview.js) übernommen.
export class Tab {
    // id:       Eindeutige UUID (generiert von generateUUID in utils.js)
    // title:    Angezeigter Name im Tab (z.B. "main.js" oder "Unbenannt.txt")
    // content:  Dateiinhalt (Text oder Data-URI bei Bildern/PDFs)
    // type:     Dateityp für Sprach-Erkennung ('javascript', 'html', 'image', etc.)
    // isActive: Ob dieser Tab gerade ausgewählt ist
    // isModified: Ob ungespeicherte Änderungen existieren
    // path:     Vollständiger Dateipfad (null bei neuen, ungespeicherten Dateien)
    constructor(id, title, content = '', type = 'javascript', bActive = false, bModified = false, filepath = null) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.type = type;
        this.isActive = bActive;
        this.isModified = bModified;
        this.path = filepath;
    }

    // getDisplayTitle gibt den Titel mit "*" Suffix zurück, wenn ungespeicherte
    // Änderungen vorhanden sind (z.B. "main.js *").
    getDisplayTitle() {
        return this.isModified ? `${this.title} *` : this.title;
    }
}