// clsFileExplorer.js — Datei-Explorer Panel.
// Zeigt den Inhalt eines Verzeichnisses als flache Liste an.
// Doppelklick auf Ordner → navigiert hinein.
// Doppelklick auf Datei → öffnet sie im Editor-Tab.
import { ListDirectory, GetHomeDirectory, RenameFile, DeleteFile } from '../wailsjs/go/main/App.js';

const ICON_FOLDER = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f6d32d" stroke="#f6d32d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
const ICON_FILE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
const ICON_UP = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';

const SVG_LIB = {
    folder: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"></path></svg>`,
    code: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    image: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    video: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
    audio: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    archive: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M21 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7"/><path d="M12 12v9"/><path d="m9 15 3 3 3-3"/></svg>`,
    spreadsheet: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M12 9v10"/></svg>`,
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
    pdf: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 75.320129 92.604164">
            <g transform="translate(53.548057 -183.975276) scale(1.4843)">
                <path fill="#ff2116" d="M-29.632812 123.94727c-3.551967 0-6.44336 2.89347-6.44336 6.44531v49.49804c0 3.55185 2.891393 6.44532 6.44336 6.44532H8.2167969c3.5519661 0 6.4433591-2.89335 6.4433591-6.44532v-40.70117s.101353-1.19181-.416015-2.35156c-.484969-1.08711-1.275391-1.84375-1.275391-1.84375a1.0584391 1.0584391 0 0 0-.0059-.008l-9.3906254-9.21094a1.0584391 1.0584391 0 0 0-.015625-.0156s-.8017392-.76344-1.9902344-1.27344c-1.39939552-.6005-2.8417968-.53711-2.8417968-.53711l.021484-.002z" color="#000" font-family="sans-serif" overflow="visible" paint-order="markers fill stroke" style="line-height:normal;font-variant-ligatures:normal;font-variant-position:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-alternates:normal;font-feature-settings:normal;text-indent:0;text-align:start;text-decoration-line:none;text-decoration-style:solid;text-decoration-color:#000000;text-transform:none;text-orientation:mixed;white-space:normal;shape-padding:0;isolation:auto;mix-blend-mode:normal;solid-color:#000000;solid-opacity:1"/>
                <path fill="#f5f5f5" d="M-29.632812 126.06445h28.3789058a1.0584391 1.0584391 0 0 0 .021484 0s1.13480448.011 1.96484378.36719c.79889772.34282 1.36536982.86176 1.36914062.86524.0000125.00001.00391.004.00391.004l9.3671868 9.18945s.564354.59582.837891 1.20899c.220779.49491.234375 1.40039.234375 1.40039a1.0584391 1.0584391 0 0 0-.002.0449v40.74609c0 2.41592-1.910258 4.32813-4.3261717 4.32813H-29.632812c-2.415914 0-4.326172-1.91209-4.326172-4.32813v-49.49804c0-2.41603 1.910258-4.32813 4.326172-4.32813z" color="#000" font-family="sans-serif" overflow="visible" paint-order="markers fill stroke" style="line-height:normal;font-variant-ligatures:normal;font-variant-position:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-alternates:normal;font-feature-settings:normal;text-indent:0;text-align:start;text-decoration-line:none;text-decoration-style:solid;text-decoration-color:#000000;text-transform:none;text-orientation:mixed;white-space:normal;shape-padding:0;isolation:auto;mix-blend-mode:normal;solid-color:#000000;solid-opacity:1"/>
                <path fill="#ff2116" d="M-23.40766 161.09299c-1.45669-1.45669.11934-3.45839 4.39648-5.58397l2.69124-1.33743 1.04845-2.29399c.57665-1.26169 1.43729-3.32036 1.91254-4.5748l.8641-2.28082-.59546-1.68793c-.73217-2.07547-.99326-5.19438-.52872-6.31588.62923-1.51909 2.69029-1.36323 3.50626.26515.63727 1.27176.57212 3.57488-.18329 6.47946l-.6193 2.38125.5455.92604c.30003.50932 1.1764 1.71867 1.9475 2.68743l1.44924 1.80272 1.8033728-.23533c5.72900399-.74758 7.6912472.523 7.6912472 2.34476 0 2.29921-4.4984914 2.48899-8.2760865-.16423-.8499666-.59698-1.4336605-1.19001-1.4336605-1.19001s-2.3665326.48178-3.531704.79583c-1.202707.32417-1.80274.52719-3.564509 1.12186 0 0-.61814.89767-1.02094 1.55026-1.49858 2.4279-3.24833 4.43998-4.49793 5.1723-1.3991.81993-2.86584.87582-3.60433.13733zm2.28605-.81668c.81883-.50607 2.47616-2.46625 3.62341-4.28553l.46449-.73658-2.11497 1.06339c-3.26655 1.64239-4.76093 3.19033-3.98386 4.12664.43653.52598.95874.48237 2.01093-.16792zm21.21809-5.95578c.80089-.56097.68463-1.69142-.22082-2.1472-.70466-.35471-1.2726074-.42759-3.1031574-.40057-1.1249.0767-2.9337647.3034-3.2403347.37237 0 0 .993716.68678 1.434896.93922.58731.33544 2.0145161.95811 3.0565161 1.27706 1.02785.31461 1.6224.28144 2.0729-.0409zm-8.53152-3.54594c-.4847-.50952-1.30889-1.57296-1.83152-2.3632-.68353-.89643-1.02629-1.52887-1.02629-1.52887s-.4996 1.60694-.90948 2.57394l-1.27876 3.16076-.37075.71695s1.971043-.64627 2.97389-.90822c1.0621668-.27744 3.21787-.70134 3.21787-.70134zm-2.74938-11.02573c.12363-1.0375.1761-2.07346-.15724-2.59587-.9246-1.01077-2.04057-.16787-1.85154 2.23517.0636.8084.26443 2.19033.53292 3.04209l.48817 1.54863.34358-1.16638c.18897-.64151.47882-2.02015.64411-3.06364z"/>
                <path fill="#2c2c2c" d="M-20.930423 167.83862h2.364986q1.133514 0 1.840213.2169.706698.20991 1.189489.9446.482795.72769.482795 1.75625 0 .94459-.391832 1.6233-.391833.67871-1.056548.97958-.65772.30087-2.02913.30087h-.818651v3.72941h-1.581322zm1.581322 1.22447v3.33058h.783664q1.049552 0 1.44838-.39184.405826-.39183.405826-1.27345 0-.65772-.265887-1.06355-.265884-.41282-.587747-.50378-.314866-.098-1.000572-.098zm5.50664-1.22447h2.148082q1.560333 0 2.4909318.55276.9375993.55276 1.4133973 1.6443.482791 1.09153.482791 2.42096 0 1.3994-.4338151 2.49793-.4268149 1.09153-1.3154348 1.76324-.8816233.67172-2.5189212.67172h-2.267031zm1.581326 1.26645v7.018h.657715q1.378411 0 2.001144-.9516.6227329-.95858.6227329-2.5539 0-3.5125-2.6238769-3.5125zm6.4722254-1.26645h5.30372941v1.26645H-4.2075842v2.85478h2.9807225v1.26646h-2.9807225v4.16322h-1.5813254z" font-family="Franklin Gothic Medium Cond" letter-spacing="0" style="line-height:125%;-inkscape-font-specification:'Franklin Gothic Medium Cond'" word-spacing="4.26000023"/>
            </g>
            </svg>`,
    javascript: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ffffff" class="bi bi-javascript" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M14 0a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zM9.053 7.596v3.127l-.007 1.752q0 .498-.186.752t-.556.263q-.342 0-.528-.234-.185-.234-.185-.684v-.175H6.37v.185q0 .665.253 1.113.255.45.703.674.44.225 1.016.225.88 0 1.406-.498.527-.498.527-1.485l.007-1.752V7.596zm3.808-.108q-.585 0-1.006.244a1.67 1.67 0 0 0-.634.674 2.1 2.1 0 0 0-.225.996q0 .753.293 1.182.303.42.967.732l.469.215q.438.186.625.43.185.244.185.635 0 .478-.166.703-.156.224-.527.224-.361.001-.547-.244-.186-.243-.205-.752h-1.162q.02.996.498 1.524.479.527 1.386.527.909 0 1.417-.518.507-.517.507-1.484 0-.81-.332-1.289t-1.045-.79l-.449-.196q-.39-.166-.556-.381-.166-.214-.166-.576 0-.4.165-.596.177-.195.508-.195.361 0 .508.234.156.234.176.703h1.123q-.03-.976-.498-1.484-.47-.518-1.309-.518"/>
                </svg>`,
    json: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ffffff" class="bi bi-filetype-json" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M14 4.5V11h-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM4.151 15.29a1.2 1.2 0 0 1-.111-.449h.764a.58.58 0 0 0 .255.384q.105.073.25.114.142.041.319.041.245 0 .413-.07a.56.56 0 0 0 .255-.193.5.5 0 0 0 .084-.29.39.39 0 0 0-.152-.326q-.152-.12-.463-.193l-.618-.143a1.7 1.7 0 0 1-.539-.214 1 1 0 0 1-.352-.367 1.1 1.1 0 0 1-.123-.524q0-.366.19-.639.192-.272.528-.422.337-.15.777-.149.456 0 .779.152.326.153.5.41.18.255.2.566h-.75a.56.56 0 0 0-.12-.258.6.6 0 0 0-.246-.181.9.9 0 0 0-.37-.068q-.324 0-.512.152a.47.47 0 0 0-.185.384q0 .18.144.3a1 1 0 0 0 .404.175l.621.143q.326.075.566.211a1 1 0 0 1 .375.358q.135.222.135.56 0 .37-.188.656a1.2 1.2 0 0 1-.539.439q-.351.158-.858.158-.381 0-.665-.09a1.4 1.4 0 0 1-.478-.252 1.1 1.1 0 0 1-.29-.375m-3.104-.033a1.3 1.3 0 0 1-.082-.466h.764a.6.6 0 0 0 .074.27.5.5 0 0 0 .454.246q.285 0 .422-.164.137-.165.137-.466v-2.745h.791v2.725q0 .66-.357 1.005-.355.345-.985.345a1.6 1.6 0 0 1-.568-.094 1.15 1.15 0 0 1-.407-.266 1.1 1.1 0 0 1-.243-.39m9.091-1.585v.522q0 .384-.117.641a.86.86 0 0 1-.322.387.9.9 0 0 1-.47.126.9.9 0 0 1-.47-.126.87.87 0 0 1-.32-.387 1.55 1.55 0 0 1-.117-.641v-.522q0-.386.117-.641a.87.87 0 0 1 .32-.387.87.87 0 0 1 .47-.129q.265 0 .47.129a.86.86 0 0 1 .322.387q.117.255.117.641m.803.519v-.513q0-.565-.205-.973a1.46 1.46 0 0 0-.59-.63q-.38-.22-.916-.22-.534 0-.92.22a1.44 1.44 0 0 0-.589.628q-.205.407-.205.975v.513q0 .562.205.973.205.407.589.626.386.217.92.217.536 0 .917-.217.384-.22.589-.626.204-.41.205-.973m1.29-.935v2.675h-.746v-3.999h.662l1.752 2.66h.032v-2.66h.75v4h-.656l-1.761-2.676z"/>
            </svg>`,
    text: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ffffff" class="bi bi-filetype-txt" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-2v-1h2a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM1.928 15.849v-3.337h1.136v-.662H0v.662h1.134v3.337zm4.689-3.999h-.894L4.9 13.289h-.035l-.832-1.439h-.932l1.228 1.983-1.24 2.016h.862l.853-1.415h.035l.85 1.415h.907l-1.253-1.992zm1.93.662v3.337h-.794v-3.337H6.619v-.662h3.064v.662H8.546Z"/>
            </svg>`,
    word: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ffffff" class="bi bi-file-earmark-word" viewBox="0 0 16 16">
            <path d="M5.485 6.879a.5.5 0 1 0-.97.242l1.5 6a.5.5 0 0 0 .967.01L8 9.402l1.018 3.73a.5.5 0 0 0 .967-.01l1.5-6a.5.5 0 0 0-.97-.242l-1.036 4.144-.997-3.655a.5.5 0 0 0-.964 0l-.997 3.655L5.485 6.88z"/>
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
            </svg>`,
    jpg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ffffff" class="bi bi-filetype-jpg" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-4.34 8.132q.114.23.14.492h-.776a.8.8 0 0 0-.097-.249.7.7 0 0 0-.17-.19.7.7 0 0 0-.237-.126 1 1 0 0 0-.299-.044q-.428 0-.665.302-.234.301-.234.85v.498q0 .351.097.615a.9.9 0 0 0 .304.413.87.87 0 0 0 .519.146 1 1 0 0 0 .457-.096.67.67 0 0 0 .272-.264q.09-.164.091-.363v-.255H8.24v-.59h1.576v.798q0 .29-.097.55a1.3 1.3 0 0 1-.293.458 1.4 1.4 0 0 1-.495.313q-.296.111-.697.111a2 2 0 0 1-.753-.132 1.45 1.45 0 0 1-.533-.377 1.6 1.6 0 0 1-.32-.58 2.5 2.5 0 0 1-.105-.745v-.506q0-.543.2-.95.201-.406.582-.633.384-.228.926-.228.357 0 .636.1.28.1.48.275t.314.407ZM0 14.786q0 .246.082.465.083.22.243.39.165.17.407.267.246.093.569.093.63 0 .984-.345.357-.346.358-1.005v-2.725h-.791v2.745q0 .303-.138.466t-.422.164a.5.5 0 0 1-.454-.246.6.6 0 0 1-.073-.27H0Zm4.92-2.86H3.322v4h.791v-1.343h.803q.43 0 .732-.172.305-.177.463-.475.162-.302.161-.677 0-.374-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179Zm.546 1.333a.8.8 0 0 1-.085.381.57.57 0 0 1-.238.24.8.8 0 0 1-.375.082H4.11v-1.406h.66q.327 0 .512.182.185.181.185.521Z"/>
            </svg>`,
};

const EXTENSION_MAP = {
    // Documents & Text
    txt: 'text', md: 'text', rtf: 'text', odt: 'text', pdf: 'pdf', 
    epub: 'text', mobi: 'text', doc: 'word', docx: 'word', pages: 'text',
    log: 'text', readme: 'text', license: 'text',

    // Spreadsheets & Data
    xls: 'spreadsheet', xlsx: 'spreadsheet', numbers: 'spreadsheet', 
    ods: 'spreadsheet', csv: 'text', tsv: 'spreadsheet',

    // Code & Config
    js: 'javascript', javascript: 'javascript', typescript: 'typescript', ts: 'typescript', tsx: 'typescript',
    html: 'code', htm: 'code', css: 'code', scss: 'code', sass: 'code',
    json: 'json', xml: 'code', py: 'code', java: 'code', cpp: 'code',
    c: 'code', php: 'code', rs: 'code', go: 'code', sh: 'code',
    yml: 'code', yaml: 'code', dockerfile: 'code', sql: 'code',

    // Images & Design
    jpg: 'jpg', jpeg: 'jpg', png: 'image', gif: 'image', svg: 'image',
    webp: 'image', bmp: 'image', ico: 'image', psd: 'image', ai: 'image',
    fig: 'image', sketch: 'image',

    // Audio
    mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', m4a: 'audio',

    // Video
    mp4: 'video', avi: 'video', mkv: 'video', mov: 'video', webm: 'video',

    // Archives
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', 
    gz: 'archive', iso: 'archive', dmg: 'archive'
};

export class FileExplorer {
    /**
     * @param {HTMLElement} container - Das DOM-Element, in das der Explorer gerendert wird
     * @param {Object} options
     * @param {Function} options.onFileOpen - Callback wenn eine Datei geöffnet wird: (filepath) => void
     */
    constructor(container, options = {}) {
        this.container = container;
        this.onFileOpen = options.onFileOpen || (() => {});
        this.currentPath = '';
        this.parentPath = '';
        this.entries = [];
        this.contextMenu = null;

        this._boundHideContext = () => this.hideContextMenu();
        this._boundEscHandler = (e) => { if (e.key === 'Escape') this.hideContextMenu(); };

        this.buildDOM();
        this.init();

        document.addEventListener('click', this._boundHideContext);
        document.addEventListener('keydown', this._boundEscHandler);
    }

    buildDOM() {
        this.container.innerHTML = '';

        this.panel = document.createElement('div');
        this.panel.className = 'file-explorer';

        // Header mit Pfadanzeige und "Hoch"-Button
        this.header = document.createElement('div');
        this.header.className = 'file-explorer-header';

        this.upBtn = document.createElement('button');
        this.upBtn.className = 'file-explorer-up-btn';
        this.upBtn.innerHTML = ICON_UP;
        this.upBtn.title = 'Übergeordneter Ordner';
        this.upBtn.addEventListener('click', () => this.navigateUp());

        this.pathLabel = document.createElement('div');
        this.pathLabel.className = 'file-explorer-path';
        this.pathLabel.title = '';

        this.header.appendChild(this.upBtn);
        this.header.appendChild(this.pathLabel);

        // Dateiliste
        this.listContainer = document.createElement('div');
        this.listContainer.className = 'file-explorer-list';

        this.panel.appendChild(this.header);
        this.panel.appendChild(this.listContainer);
        this.container.appendChild(this.panel);
        this.container.style.display = 'none';
    }

    async init() {
        try {
            const home = await GetHomeDirectory();
            await this.navigate(home);
        } catch (err) {
            console.error('FileExplorer init failed:', err);
            await this.navigate('/');
        }
    }

    async navigate(path) {
        try {
            const result = await ListDirectory(path);
            if (result.error) {
                console.error('ListDirectory error:', result.error);
                return;
            }

            this.currentPath = result.path;
            this.parentPath = result.parent;
            this.entries = result.entries || [];
            this.render();
        } catch (err) {
            console.error('Navigate failed:', err);
        }
    }

    navigateUp() {
        if (this.parentPath) {
            this.navigate(this.parentPath);
        }
    }

    render() {
        // Pfadanzeige aktualisieren
        const displayPath = this.truncatePath(this.currentPath, 25);
        this.pathLabel.textContent = displayPath;
        this.pathLabel.title = this.currentPath;

        // "Hoch"-Button nur aktiv, wenn ein Parent-Verzeichnis existiert
        this.upBtn.disabled = !this.parentPath;
        this.upBtn.style.opacity = this.parentPath ? '1' : '0.3';

        // Liste aufbauen
        this.listContainer.innerHTML = '';

        for (const entry of this.entries) {
            const item = document.createElement('div');
            item.className = entry.isDirectory ? 'file-item folder' : 'file-item file';

            const icon = document.createElement('span');
            icon.className = 'file-item-icon';

            if (entry.isDirectory) {
                icon.innerHTML = ICON_FOLDER;
            } else {
                //icon.textContent = this.getFileIcon(entry);
                icon.innerHTML = this.getFileIcon(entry);
            }
            //icon.innerHTML = entry.isDirectory ? ICON_FOLDER : ICON_FILE;

            const name = document.createElement('span');
            name.className = 'file-item-name';
            name.textContent = entry.name;
            name.title = entry.name;

            item.appendChild(icon);
            item.appendChild(name);

            // Single-click: auswählen
            item.addEventListener('click', () => {
                this.listContainer.querySelectorAll('.file-item').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');
            });

            // Double-click: Ordner öffnen oder Datei laden
            item.addEventListener('dblclick', () => {
                if (entry.isDirectory) {
                    this.navigate(entry.path);
                } else {
                    this.onFileOpen(entry.path);
                }
            });

            // Right-click: Kontextmenü
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.listContainer.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                this.showContextMenu(e.clientX, e.clientY, entry, item);
            });

            this.listContainer.appendChild(item);
        }
    }

    truncatePath(path, maxLen) {
        if (!path || path.length <= maxLen) return path;
        const parts = path.split('/').filter(Boolean);
        if (parts.length <= 2) return path;
        return '.../' + parts.slice(-2).join('/');
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    toggle() {
        if (this.container.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }

    isVisible() {
        return this.container.style.display !== 'none';
    }  
    
    getFileIcon(entry) {

        if (entry.isDir) return SVG_LIB.folder;

        const name = entry.name.toLowerCase();
        const ext = name.split('.').pop();

        // Check for exact filename match first (e.g. "Dockerfile")
        if (EXTENSION_MAP[name]) {
            return SVG_LIB[EXTENSION_MAP[name]];
        }

        // Otherwise, check by extension
        const category = EXTENSION_MAP[ext];
        return SVG_LIB[category] || SVG_LIB.default;
    }

    // ===== Kontextmenü =====

    showContextMenu(x, y, entry, itemEl) {
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'explorer-context-menu';

        const items = [
            { label: 'Umbenennen', action: () => this.startRename(entry, itemEl) },
            { label: 'Löschen', action: () => this.confirmDelete(entry) },
        ];

        items.forEach(({ label, action }) => {
            const el = document.createElement('div');
            el.className = 'explorer-context-menu-item';
            el.textContent = label;
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideContextMenu();
                action();
            });
            menu.appendChild(el);
        });

        document.body.appendChild(menu);
        this.contextMenu = menu;

        // Viewport-Korrektur
        const rect = menu.getBoundingClientRect();
        menu.style.left = (x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 8 : x) + 'px';
        menu.style.top = (y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 8 : y) + 'px';
    }

    hideContextMenu() {
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
        this.contextMenu = null;
    }

    // ===== Umbenennen (Inline) =====

    startRename(entry, itemEl) {
        const nameSpan = itemEl.querySelector('.file-item-name');
        if (!nameSpan) return;

        const oldName = entry.name;
        const input = document.createElement('input');
        input.className = 'file-item-rename-input';
        input.value = oldName;

        // Dateiname ohne Extension vorselektieren
        const dotIndex = oldName.lastIndexOf('.');
        const selectEnd = (!entry.isDirectory && dotIndex > 0) ? dotIndex : oldName.length;

        nameSpan.replaceWith(input);
        input.focus();
        input.setSelectionRange(0, selectEnd);

        const commit = async () => {
            const newName = input.value.trim();
            if (!newName || newName === oldName) {
                // Abbruch — Name wiederherstellen
                input.replaceWith(nameSpan);
                return;
            }

            const dir = entry.path.substring(0, entry.path.length - oldName.length);
            const newPath = dir + newName;

            try {
                await RenameFile(entry.path, newPath);
                await this.navigate(this.currentPath);
            } catch (err) {
                alert('Umbenennen fehlgeschlagen: ' + err);
                input.replaceWith(nameSpan);
            }
        };

        let committed = false;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                committed = true;
                commit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                committed = true;
                input.replaceWith(nameSpan);
            }
        });
        input.addEventListener('blur', () => {
            if (!committed) {
                committed = true;
                commit();
            }
        });
    }

    // ===== Löschen =====

    async confirmDelete(entry) {
        const type = entry.isDirectory ? 'Ordner' : 'Datei';
        if (!confirm(`${type} "${entry.name}" wirklich löschen?`)) return;

        try {
            await DeleteFile(entry.path);
            await this.navigate(this.currentPath);
        } catch (err) {
            alert('Löschen fehlgeschlagen: ' + err);
        }
    }
}

