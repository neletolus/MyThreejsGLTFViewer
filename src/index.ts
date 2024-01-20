import "./scss/index.scss";
import { handleDragOver, handleFileSelect } from "./glbConverter";
import { renderView, loadHDR, loadAnimation } from "./renderView";

window.addEventListener("DOMContentLoaded", init);

function init() {
    // ドラッグアンドドロップのイベント
    const dropZone = document.getElementById("drop_zone");
    dropZone?.addEventListener('dragover', handleDragOver, false);
    dropZone?.addEventListener('drop', handleFileSelect, false);

    // アコーディオンメニューの開閉
    document.addEventListener('click', function (event) {
        const target = event.target as HTMLElement;
        if (target.id === "drop_menu" || target.classList.contains("optionHead")) {
            const nextElement = target.nextElementSibling
            if (target.classList.contains("opened")) {
                target.classList.remove("opened");
                nextElement?.classList.add("hidden");
            } else {
                target.classList.add("opened");
                nextElement?.classList.remove("hidden");
            }
        }
    })

    // ラジオボタンの変更イベント
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
            // HTMLInputElementでないとき用。不要のため握りつぶす
            console.log(error);
        }
    })

    renderView();
}
