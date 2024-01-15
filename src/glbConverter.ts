import { loadGLB } from "./renderView";
/**
 * GLTFファイルと必要なファイル群をGLBにまとめる処理のjs
 */
let gltf: any;
let fileblobs: any = [];
let files: File[] = [];
let remainingfilestoprocess = 0;
let glbfilename: string = "";

let outputBuffers: ArrayBuffer[] = [];
let bufferMap: Map<number, number> = new Map();
let bufferOffset: number = 0;

const gltfMimeTypes: any = {
    'image/png': ['png'],
    'image/jpeg': ['jpg', 'jpeg'],
    'text/plain': ['glsl', 'vert', 'vs', 'frag', 'fs', 'txt'],
    'image/vnd-ms.dds': ['dds']
};

function addDownloadButton(): void {
    const btn = document.createElement("button");
    btn.id = "downloadBtn";
    btn.disabled = true;
    btn.onclick = startDownload;
    btn.appendChild(document.createTextNode("Processing..."));
    document.getElementById("download")?.appendChild(btn);
}

export function handleDragOver(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (event.dataTransfer?.dropEffect == null) return
    event.dataTransfer.dropEffect = 'copy';
}

export function handleFileSelect(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    document.getElementById('list')!!.innerHTML = "";
    addDownloadButton();
    const items = event.dataTransfer?.items;
    if (items == null) return

    remainingfilestoprocess = items.length;
    for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
            traverseFileTree(entry, null);
        }
    }
}

function startDownload(): void {
    document.getElementById("downloadLink")?.click();
}

function traverseFileTree(item: FileSystemEntry, path: string | null): void {
    path = path || "";
    if (item.isFile) {
        (item as FileSystemFileEntry).file(function (file: File) {
            files.push(file);
            const lastModifiedDate = new Date(file.lastModified).toLocaleDateString("ja-jp")
            const fileitem = '<li><strong>' + escape(file.name) + '</strong> (' + file.type + ') - ' +
                file.size + ' bytes, last modified: ' + lastModifiedDate +
                '</li>';
            document.getElementById('list')!!.innerHTML += fileitem;

            const extension = file.name.split('.').pop();
            if (extension === "gltf") {
                glbfilename = file.name.substr(file.name.lastIndexOf('/') + 1, file.name.lastIndexOf('.'));
                const reader = new FileReader();
                reader.readAsText(file);
                reader.onload = function (event) {
                    gltf = JSON.parse(event!!.target!!.result as string);
                    checkRemaining();
                };
            }
            else {
                const reader = new FileReader();
                reader.onload = (function (theFile) {
                    return function (e) {
                        console.log(e!!.target!!.result);

                        fileblobs[theFile.name.toLowerCase()] = (e!!.target!!.result);
                        checkRemaining();
                    };
                })(file);
                reader.readAsArrayBuffer(file);
            }
        }, function (error: any) {
            console.log(error);
        });
    } else if (item.isDirectory) {
        const dir = item as FileSystemDirectoryEntry
        const dirReader = dir.createReader();
        dirReader.readEntries(function (entries: FileSystemEntry[]) {
            remainingfilestoprocess += entries.length;
            checkRemaining();
            for (let i = 0; i < entries.length; i++) {
                traverseFileTree(entries[i], path + item.name + "/");
            }
        });
    }
}

function checkRemaining(): void {
    remainingfilestoprocess--;
    if (remainingfilestoprocess === 0) {
        outputBuffers = [];
        bufferMap = new Map();
        bufferOffset = 0;
        processBuffers().then(fileSave);
    }
}

function processBuffers() {
    const pendingBuffers = gltf.buffers.map(function (buffer: any, bufferIndex: number) {
        return dataFromUri(buffer)
            .then(function (data: any) {
                if (data !== undefined) {
                    outputBuffers.push(data);
                }
                delete buffer.uri;
                buffer.byteLength = data.byteLength;
                bufferMap.set(bufferIndex, bufferOffset);
                bufferOffset += alignedLength(data.byteLength);
            });
    });

    return Promise.all(pendingBuffers)
        .then(function () {
            let bufferIndex = gltf.buffers.length;
            const images = gltf.images || [];
            const pendingImages = images.map(function (image: any) {
                return dataFromUri(image).then(function (data: any) {
                    if (data === undefined) {
                        delete image['uri'];
                        return;
                    }
                    const bufferView = {
                        buffer: 0,
                        byteOffset: bufferOffset,
                        byteLength: data.byteLength,
                    };
                    bufferMap.set(bufferIndex, bufferOffset);
                    bufferIndex++;
                    bufferOffset += alignedLength(data.byteLength);
                    const bufferViewIndex = gltf.bufferViews.length;
                    gltf.bufferViews.push(bufferView);
                    outputBuffers.push(data);
                    image['bufferView'] = bufferViewIndex;
                    image['mimeType'] = getMimeType(image.uri);
                    delete image['uri'];
                });
            });
            return Promise.all(pendingImages);
        });
}

function fileSave() {
    const Binary = {
        Magic: 0x46546C67
    };

    for (let _i = 0, _a = gltf.bufferViews; _i < _a.length; _i++) {
        const bufferView = _a[_i];
        if (bufferView.byteOffset === undefined) {
            bufferView.byteOffset = 0;
        }
        else {
            bufferView.byteOffset = bufferView.byteOffset + bufferMap.get(bufferView.buffer);
        }
        bufferView.buffer = 0;
    }
    const binBufferSize = bufferOffset;
    gltf.buffers = [{
        byteLength: binBufferSize
    }];

    const enc = new TextEncoder();
    const jsonBuffer = enc.encode(JSON.stringify(gltf));
    const jsonAlignedLength = alignedLength(jsonBuffer.length);
    let padding;
    if (jsonAlignedLength !== jsonBuffer.length) {

        padding = jsonAlignedLength - jsonBuffer.length;
    }
    const totalSize = 12 + // file header: magic + version + length
        8 + // json chunk header: json length + type
        jsonAlignedLength +
        8 + // bin chunk header: chunk length + type
        binBufferSize;
    const finalBuffer = new ArrayBuffer(totalSize);
    const dataView = new DataView(finalBuffer);
    let bufIndex = 0;
    dataView.setUint32(bufIndex, Binary.Magic, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, 2, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, totalSize, true);
    bufIndex += 4;
    // JSON
    dataView.setUint32(bufIndex, jsonAlignedLength, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, 0x4E4F534A, true);
    bufIndex += 4;

    for (let j = 0; j < jsonBuffer.length; j++) {
        dataView.setUint8(bufIndex, jsonBuffer[j]);
        bufIndex++;
    }
    if (padding !== undefined) {
        for (let j = 0; j < padding; j++) {
            dataView.setUint8(bufIndex, 0x20);
            bufIndex++;
        }
    }

    // BIN
    dataView.setUint32(bufIndex, binBufferSize, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, 0x004E4942, true);
    bufIndex += 4;
    for (let i = 0; i < outputBuffers.length; i++) {
        const bufoffset = bufIndex + bufferMap.get(i)!!;
        const buf = new Uint8Array(outputBuffers[i]);
        let thisbufindex = bufoffset;
        for (let j = 0; j < buf.byteLength; j++) {
            dataView.setUint8(thisbufindex, buf[j]);
            thisbufindex++;
        }
    }
    const a = document.getElementById("downloadLink") as HTMLAnchorElement;
    const file = new Blob([finalBuffer], { type: 'model/json-binary' });
    loadGLB(URL.createObjectURL(file));
}

function isBase64(uri: string): any {
    return uri.length < 5 ? false : uri.substr(0, 5) === "data:";
}
function decodeBase64(uri: string): any {
    return fetch(uri).then(function (response) { return response.arrayBuffer(); });
}
function dataFromUri(buffer: any): any {
    if (buffer.uri === undefined) {
        return Promise.resolve(undefined);
    } else if (isBase64(buffer.uri)) {
        return decodeBase64(buffer.uri);
    } else {
        var filename = buffer.uri.substr(buffer.uri.lastIndexOf('/') + 1);
        return Promise.resolve(fileblobs[filename.toLowerCase()]);
    }
}

function alignedLength(value: number): number {
    var alignValue = 4;
    if (value == 0) {
        return value;
    }
    var multiple = value % alignValue;
    if (multiple === 0) {
        return value;
    }
    return value + (alignValue - multiple);
}

function getMimeType(filename: string): string {
    for (let mimeType in gltfMimeTypes) {
        for (let extensionIndex in gltfMimeTypes[mimeType]) {
            const extension = gltfMimeTypes[mimeType][extensionIndex];
            if (filename.toLowerCase().endsWith('.' + extension)) {
                return mimeType;
            }
        }
    }
    return 'application/octet-stream';
}