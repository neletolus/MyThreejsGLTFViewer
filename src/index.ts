import "./scss/index.scss";
import { handleDragOver, handleFileSelect } from "./glbConverter";
import { renderView, loadHDR, loadAnimation } from "./renderView";

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
    });

    const radio_btns = document.querySelectorAll("input[type='radio'][name='hdr']");

    for (let index = 0; index < radio_btns.length; index++) {
        const target = radio_btns[index] as HTMLInputElement
        target.addEventListener('change', function () {
            if (target.checked) {
                loadHDR(parseInt(target.value))
            }
        });
    }

    document.addEventListener('change', function (event) {
        try {
            const target = event.target as HTMLInputElement;
            if (target.name == "hdr") {
                if (target.checked) {
                    loadHDR(parseInt(target.value))
                }
            } else if (target.name == "animations") {
                if (target.checked) {
                    loadAnimation(parseInt(target.value))
                }
            }
        } catch (error) {
            // 不要のため握りつぶす
            console.log(error);

        }
    })



    // todo: 右側のオプションアコーディオン群の処理

    renderView();
}
