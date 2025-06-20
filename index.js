// ItemManager/index.js (Shift+クリック版 / Hypixel SkyBlockバグ対策済み)

// --- 設定 ---
const SETTINGS_FILE = "config/ItemManagerSettings.json";
const LOCK_KEY = Keyboard.KEY_L;
// [変更点] スワップに使用するキーをShiftキーに戻しました。
const SWAP_KEY = Keyboard.KEY_LSHIFT; 

// --- グローバル変数 ---
let settings = { lockedSlots: [], bindings: {} };
let isBinding = false;
let sourceSlotToBind = null;

// --- 関数の定義 ---

function loadSettings() {
    if (FileLib.exists(SETTINGS_FILE)) {
        try {
            const fileContent = FileLib.read(SETTINGS_FILE);
            if (fileContent) {
                const loadedSettings = JSON.parse(fileContent);
                settings.lockedSlots = loadedSettings.lockedSlots || [];
                settings.bindings = loadedSettings.bindings || {};
                ChatLib.chat("&a[ItemManager] &f設定を読み込みました。");
            }
        } catch (e) {
            ChatLib.chat("&c[ItemManager] &f設定ファイルの読み込みに失敗しました。");
            console.log("[ItemManager] Error loading settings: " + e);
            settings = { lockedSlots: [], bindings: {} };
        }
    }
}

function saveSettings() {
    FileLib.write(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function isSlotLocked(slotIndex) {
    return settings.lockedSlots.includes(slotIndex);
}

function stopBindingMode() {
    if (isBinding) {
        isBinding = false;
        sourceSlotToBind = null;
        ChatLib.chat("&c[ItemManager] &fバインドモードを中断しました。");
    }
}

/**
 * 現在開いているGUIが、このスクリプトの機能を有効にして良いか判定します。
 * Hypixel SkyBlockのバックパックなど、特殊なGUIでの誤動作を厳格に防ぎます。
 * @returns {boolean} - 許可されたGUIであればtrue
 */
function isAllowedGui() {
    const gui = Client.currentGui.get();
    if (!gui) return false;

    if (gui instanceof Java.type("net.minecraft.client.gui.inventory.GuiInventory")) {
        return true;
    }

    if (gui instanceof Java.type("net.minecraft.client.gui.inventory.GuiChest")) {
        try {
            const container = Player.getContainer();
            if (!container) return false;
            const containerName = ChatLib.removeFormatting(container.getName()).toLowerCase();

            const skyblockGuiKeywords = [
                "backpack", "sack", "storage", "wardrobe", "chest",
                "accessory bag", "potion bag", "fishing bag", "quiver",
                "skyblock menu", "skills", "collections", "recipe book", "trades",
                "auction", "bazaar", "bank", "reforge", "hex", "dungeon",
                "experiment", "enchant", "anvil", "rune", "pet", "ender slate"
            ];
            
            if (containerName.includes("craft")) {
                return containerName === "crafting table";
            }
            
            if (containerName === "chest" || containerName === "large chest") {
                return true;
            }

            for (const keyword of skyblockGuiKeywords) {
                if (containerName.includes(keyword)) {
                    return false;
                }
            }
            
            return false;
        } catch (e) {
            console.log("[ItemManager] Error checking GUI: " + e);
            return false;
        }
    }
    
    return false;
}

// --- 初期化処理 ---
loadSettings();

// --- コマンド登録 ---
register("command", (arg1) => {
    const command = arg1 ? arg1.toLowerCase() : "";

    switch (command) {
        case "bind":
            isBinding = true;
            sourceSlotToBind = null;
            ChatLib.chat("&a[ItemManager] &fバインドモードを開始します。");
            ChatLib.chat("&e1. &f入れ替え元のインベントリスロットをクリックしてください。");
            break;
        case "clearbinds":
            settings.bindings = {};
            saveSettings();
            ChatLib.chat("&a[ItemManager] &fすべてのバインドを解除しました。");
            break;
        case "clearlocks":
            settings.lockedSlots = [];
            saveSettings();
            ChatLib.chat("&a[ItemManager] &fすべてのロックを解除しました。");
            break;
        case "list":
            ChatLib.chat("&a[ItemManager] &f現在の設定:");
            ChatLib.chat("&eロック中のスロット: &f" + (settings.lockedSlots.length > 0 ? settings.lockedSlots.join(", ") : "なし"));
            ChatLib.chat("&eバインド一覧:");
            if (Object.keys(settings.bindings).length === 0) {
                ChatLib.chat("&7- なし");
            } else {
                for (const source in settings.bindings) {
                    const target = settings.bindings[source];
                    ChatLib.chat(`&7- &fインベントリ &e${source} &7<-> &fホットバー &e${parseInt(target) + 1}`);
                }
            }
            break;
        default:
            ChatLib.chat("&f--- &aItemManager ヘルプ &f---");
            ChatLib.chat("&e/itemmanager bind &7- スロットのバインドを開始します。");
            ChatLib.chat("&e/itemmanager clearbinds &7- すべてのバインドを解除します。");
            ChatLib.chat("&e/itemmanager clearlocks &7- すべてのロックを解除します。");
            ChatLib.chat("&e/itemmanager list &7- 現在の設定一覧を表示します。");
            ChatLib.chat("&bロック/アンロック: &fインベントリ内で &eLキー &fを押しながらスロットをクリック");
            // [変更点] ヘルプメッセージをShiftキーに戻しました。
            ChatLib.chat("&bアイテムスワップ: &fインベントリ内で &eShiftキー &fを押しながらバインド元スロットをクリック");
            break;
    }
}).setName("itemmanager");

// --- GUI操作のトリガー ---
register("guiMouseClick", (x, y, button, gui, event) => {
    if (!isAllowedGui()) return;
    if (!Client.currentGui.get() || !Client.currentGui.getSlotUnderMouse()) return;
    
    const slot = Client.currentGui.getSlotUnderMouse();
    const slotIndex = slot.getIndex();
    
    const isSwapAction = button === 0 && settings.bindings.hasOwnProperty(slotIndex);

    if (Keyboard.isKeyDown(LOCK_KEY)) {
        cancel(event);
        if (isSlotLocked(slotIndex)) {
            settings.lockedSlots = settings.lockedSlots.filter(s => s !== slotIndex);
            ChatLib.chat(`&a[ItemManager] &fスロット &e${slotIndex} &fをアンロックしました。`);
        } else {
            settings.lockedSlots.push(slotIndex);
            ChatLib.chat(`&a[ItemManager] &fスロット &e${slotIndex} &fをロックしました。`);
        }
        saveSettings();
        return;
    }

    if (isBinding) {
        cancel(event);
        if (isSlotLocked(slotIndex)) {
            ChatLib.chat(`&c[ItemManager] &fスロット &e${slotIndex} &fはロックされているため、バインドできません。`);
            return;
        }
        if (sourceSlotToBind === null) {
            if (slotIndex >= 9 && slotIndex <= 35) {
                sourceSlotToBind = slotIndex;
                ChatLib.chat(`&a[ItemManager] &f入れ替え元スロット(&e${sourceSlotToBind}&f)を選択しました。`);
                ChatLib.chat("&e2. &f次に入れ替え先の&cホットバー&fのスロットをクリックしてください。");
            } else {
                ChatLib.chat("&c[ItemManager] &fインベントリ内のスロットを選択してください。(ホットバー、防具スロット以外)");
            }
        } else {
            if (slotIndex >= 36 && slotIndex <= 44) {
                const hotbarSlot = slotIndex - 36;
                settings.bindings[sourceSlotToBind] = hotbarSlot;
                saveSettings();
                ChatLib.chat(`&a[ItemManager] &fバインド完了: インベントリ(&e${sourceSlotToBind}&f) <-> ホットバー(&e${hotbarSlot + 1}&f)`);
                isBinding = false;
                sourceSlotToBind = null;
            } else {
                ChatLib.chat("&c[ItemManager] &f入れ替え先はホットバーのスロットを選択してください。");
            }
        }
        return;
    }
    
    // スワップ処理を SWAP_KEY (Shiftキー) + 左クリックで発動
    if (Keyboard.isKeyDown(SWAP_KEY) && isSwapAction) {
        cancel(event);
        const hotbarSlotNumber = settings.bindings[slotIndex];
        
        try {
            Client.getMinecraft().field_71442_b.func_78753_a(
                Player.getContainer().getWindowId(), slotIndex, hotbarSlotNumber, 2, Player.getPlayer()
            );
        } catch (e) {
            ChatLib.chat("&c[ItemManager] &lエラー: &cアイテムのスワップに失敗しました。");
            console.log("--- ItemManager Swap Error ---");
            console.log(e);
            console.log("----------------------------");
        }
        return;
    }
    
    if (isSlotLocked(slotIndex)) {
        cancel(event);
        return;
    }
});

// --- その他のGUI関連トリガー ---
register("key", (key, event) => {
    if (!isAllowedGui()) return;
    if (key === Keyboard.KEY_Q && isSlotLocked(Player.getHeldItemIndex() + 36)) {
        cancel(event);
    }
}).setPriority(Priority.HIGHEST);

register("guiClosed", () => {
    stopBindingMode();
});

register("renderSlot", (slot) => {
    if (!isAllowedGui()) return;
    if (isSlotLocked(slot.getIndex())) {
        Renderer.drawRect(Renderer.color(255, 0, 0, 100), slot.getDisplayX(), slot.getDisplayY(), 16, 16);
    }
});

register("step", () => {
    if (isBinding && !Client.currentGui.get()) {
        stopBindingMode();
    }
}).setFps(1);