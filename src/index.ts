import { handleDragOver, handleFileSelect } from "./glbConverter";
import { renderView } from "./renderView";

window.addEventListener("DOMContentLoaded", init);

function init() {
    const dropZone = document.getElementById("drop_zone");
    dropZone?.addEventListener('dragover', handleDragOver, false);
    dropZone?.addEventListener('drop', handleFileSelect, false);
    renderView();
}
