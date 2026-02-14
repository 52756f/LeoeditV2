export namespace main {
	
	export class BinaryFileResult {
	    data: string;
	    mimeType: string;
	    isImage: boolean;
	    isPdf: boolean;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new BinaryFileResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.mimeType = source["mimeType"];
	        this.isImage = source["isImage"];
	        this.isPdf = source["isPdf"];
	        this.error = source["error"];
	    }
	}
	export class FileEntry {
	    name: string;
	    path: string;
	    isDirectory: boolean;
	    size: number;
	    extension: string;
	
	    static createFrom(source: any = {}) {
	        return new FileEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDirectory = source["isDirectory"];
	        this.size = source["size"];
	        this.extension = source["extension"];
	    }
	}
	export class DirectoryResult {
	    path: string;
	    parent: string;
	    entries: FileEntry[];
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new DirectoryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.parent = source["parent"];
	        this.entries = this.convertValues(source["entries"], FileEntry);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EditorSettings {
	    font: string;
	    fontSize: number;
	
	    static createFrom(source: any = {}) {
	        return new EditorSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.font = source["font"];
	        this.fontSize = source["fontSize"];
	    }
	}
	
	export class FileResult {
	    content: string;
	    filename: string;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new FileResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.content = source["content"];
	        this.filename = source["filename"];
	        this.error = source["error"];
	    }
	}
	export class ProjectConfig {
	    name: string;
	    rootPath: string;
	    version: string;
	    created: string;
	    lastOpened: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.rootPath = source["rootPath"];
	        this.version = source["version"];
	        this.created = source["created"];
	        this.lastOpened = source["lastOpened"];
	    }
	}
	export class RecentProject {
	    name: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new RecentProject(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	    }
	}
	export class SaveResult {
	    success: boolean;
	    path: string;
	    title: string;
	    message?: string;
	
	    static createFrom(source: any = {}) {
	        return new SaveResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.path = source["path"];
	        this.title = source["title"];
	        this.message = source["message"];
	    }
	}
	export class SearchMatch {
	    filePath: string;
	    fileName: string;
	    lineNumber: number;
	    lineText: string;
	    matchStart: number;
	
	    static createFrom(source: any = {}) {
	        return new SearchMatch(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.fileName = source["fileName"];
	        this.lineNumber = source["lineNumber"];
	        this.lineText = source["lineText"];
	        this.matchStart = source["matchStart"];
	    }
	}
	export class SearchResult {
	    query: string;
	    rootPath: string;
	    matches: SearchMatch[];
	    totalFiles: number;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.rootPath = source["rootPath"];
	        this.matches = this.convertValues(source["matches"], SearchMatch);
	        this.totalFiles = source["totalFiles"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

