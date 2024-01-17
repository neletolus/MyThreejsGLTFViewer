import "./scss/index.scss";
import { handleDragOver, handleFileSelect } from "./glbConverter";
import { renderView } from "./renderView";

window.addEventListener("DOMContentLoaded", init);

function init() {
    const dropZone = document.getElementById("drop_zone");
    dropZone?.addEventListener('dragover', handleDragOver, false);
    dropZone?.addEventListener('drop', handleFileSelect, false);

    const dropMenu = document.getElementById("drop_menu");
    dropMenu?.addEventListener("click", function () {
        if (dropMenu.classList.contains("opened")) {
            dropMenu.classList.remove("opened");
            dropZone?.classList.add("hidden");
        } else {
            dropMenu.classList.add("opened");
            dropZone?.classList.remove("hidden");
        }
    })

    renderView();
}
