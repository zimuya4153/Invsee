/// <reference path='d:/dts/dts/helperlib/src/index.d.ts'/> 
/// <reference path='../GMLIB-LegacyRemoteCallApi/lib/BEPlaceholderAPI-JS.d.ts'/> 
/// <reference path='../GMLIB-LegacyRemoteCallApi/lib/EventAPI-JS.d.ts'/>
/// <reference path='../GMLIB-LegacyRemoteCallApi/lib/GMLIB_API-JS.d.ts'/>
(() => {
    let requireFunction = {};
    const modules = ['GMLIB-LegacyRemoteCallApi/lib/GMLIB_API-JS.js', 'GMLIB-LegacyRemoteCallApi/lib/EventAPI-JS.js', 'GMLIB-LegacyRemoteCallApi/lib/BEPlaceholderAPI-JS.js'];
    modules.forEach(path => {
        try { requireFunction = Object.assign(requireFunction, require(`./${path}`)); } catch { }
        try { requireFunction = Object.assign(requireFunction, require(`./../${path}`)); } catch { }
    });
    Object.keys(requireFunction).forEach(name => this[name] = requireFunction[name]);
})();

if (Version.getLrcaVersion().valueOf() < Version.fromString('0.13.1').valueOf()) {
    const text = `The version of the GMLIB-LegacyRemoteCallApi plug-in is too low. The minimum version supported is 0.13.1. The current version is ${Version.getLrcaVersion().toString(false)}`;
    for (let i = 0;i < 5;i++) logger.error(text);
    throw new Error(text);
}

let config = {
    /** 默认语言 @type {string} */
    'Language': 'zh_CN',
    /** 占位物品的SNBT @type {string} */
    'PlaceholderItem': `{"Count":1b,"Name":"minecraft:gray_stained_glass_pane","tag":{"display":{"Name":""},"ench":[]}}`,
    /** 占位格子 @type {number[]} */
    'PlaceholderSlot': [36, 37, 38, 39, 40, 41, 42, 43, 44, 49, 51, 53],
    /** 不要颜色文本 @type {boolean} */
    'noColorText': false,
    /** 命令相关 */
    'command': {
        /** 命令 @type {string} */
        'command': 'invsee',
        /** 别名 @type {string} */
        'alias': ''
    },
    /** 编辑UI栏警告 @type {boolean} */
    'editUIWarning': true
};
/** 正在查包的玩家信息 @type {Object.<string,{uuid:string,type:'inventory'|'enderchest'|'uiitem',containerPos:[IntPos,IntPos|null],refrsh:boolean,handle:boolean}>} */
let invsees = {};
/** 翻译字符串 @type {function(string,string?,...string):string} */
const tr = (key, language = null, ...args) => I18nAPI.get(key, args, language || config['Language']).replace(new RegExp(config.noColorText ? '§.' : '', 'g'), '');
/** 查包箱子会话ID @type {number} */
const ContainerID = -(13 + 14 + 5 + 2 + 0);
Event.listen('SendContainerClosePacket', player => {
    if (!invsees[player.uuid]) return;
    player.sendUpdateBlockPacket(invsees[player.uuid].containerPos[0], Minecraft.getBlockRuntimeId(mc.getBlock(invsees[player.uuid].containerPos[0]).type));
    if (invsees[player.uuid].containerPos[1]) player.sendUpdateBlockPacket(invsees[player.uuid].containerPos[1], Minecraft.getBlockRuntimeId(mc.getBlock(invsees[player.uuid].containerPos[0]).type));
    delete invsees[player.uuid];
    player.refreshItems();
});
mc.listen('onLeft', player => delete invsees[player.uuid]);
mc.listen('onServerStarted', () => {
    I18nAPI.loadLanguageDirectory(`./plugins/Invsee/Language`);
    try {
        const path = `./plugins/Invsee/config.json`;
        if (!File.exists(path)) File.writeTo(path, JSON.stringify(config, null, 4));
        config = Object.assign(config, JSON.parse(File.readFrom(path)));
    } catch (error) { logger.error(tr('plugin.invsee.error.config.loading.error', null, error)); }
    const cmd = mc.newCommand(config.command.command, tr('commands.invsee.description'), PermType.GameMasters, 0x80, config.command.alias);
    cmd.optional('player', ParamType.String);
    cmd.setEnum('action', ['inventory', 'enderchest', 'uiitem']);
    cmd.optional('action', ParamType.Enum, 'action', 1);
    cmd.overload(['player', 'action']);
    cmd.setCallback((_cmd, origin, output, /** @type {{player:string|null,action:'inventory'|'enderchest'|'uiitem'|null}} */results) => {
        if (!origin.player) return output.error(tr('commands.invsee.error.no_player'));
        if ([0, null, undefined].includes(results.player?.length)) return GUI.main(origin.player);
        const player = origin.player,
            uuid = UserCache.getAllPlayerInfo().sort(info =>
                info.Name.length - info.Name.length
            ).find(info =>
                info.Name.includes(results.player)
            )?.Uuid;
        if (!uuid) return output.error(tr('commands.invsee.search.error', player.langCode, results.player));
        if (results.action === 'uiitem' && config.editUIWarning) origin.player.sendToast(tr('plugin.invsee.chest.toast.title', player.langCode), tr('plugin.invsee.chest.toast.open.uiitem', player.langCode, UserCache.getNameByUuid(uuid)));
        startInvsee(player, uuid, results.action || 'inventory');
    });
    if (!cmd.setup()) logger.error(tr('commands.invsee.setup.error'));
});
/**
 * @param {Player} player 
 * @param {string} containerNetId 
 * @param {number} slot 
 */
function getItem(player, containerNetId, slot) {
    switch (containerNetId) {
        case 'LevelEntityContainer':
            const uuid = invsees[player.uuid].uuid;
            switch (invsees[player.uuid].type) {
                case 'enderchest':
                    return new OffLineItem(uuid, 'EnderChestInventory', slot);
                case 'uiitem':
                    return new OffLineItem(uuid, 'PlayerUIItems', slot);
                case 'inventory':
                    if (slot < 36) return new OffLineItem(uuid, 'Inventory', slot);
                    if ([45, 46, 47, 48].includes(slot)) return new OffLineItem(uuid, 'Armor', slot - 45);
                    if ([50].includes(slot)) return new OffLineItem(uuid, 'Offhand');
                    if ([52].includes(slot)) return new OffLineItem(uuid, 'PlayerUIItems');
                    throw new Error(`Unknown slot: ${slot}`);
                default:
                    throw new Error(`Unknown invsee type: ${invsees[player.uuid].type}`);
            }
        case 'HotbarContainer':
        case 'InventoryContainer':
            return new OffLineItem(player.uuid, 'Inventory', slot);
        case 'CursorContainer':
            return new OffLineItem(player.uuid, 'PlayerUIItems');
        case 'CombinedHotbarAndInventoryContainer':
            return new OffLineItem(player.uuid, 'Inventory', slot);
        default:
            throw new Error(`Unknown containerNetId: ${containerNetId}`);
    }
}

Event.listen('HandleRequestAction', (player, actionType, count, sourceContainerNetId, sourceSlot, destinationContainerNetId, destinationSlot) => {
    if (!Object.keys(invsees).some(invsee => invsee === player.uuid || invsees[invsee].uuid === player.uuid)) return;
    Object.keys(invsees).forEach(invsee => {
        if (invsee !== player.uuid && invsees[invsee].uuid !== player.uuid) return;
        if (invsees[invsee].uuid === player.uuid && !invsees[invsee].refrsh) {
            invsees[invsee].refrsh = true;
            updateInvsee(Minecraft.getPlayerFromUuid(invsee));
            setTimeout(() => invsees[invsee].refrsh = false, 10);
        }
        if (player.uuid === invsee && !invsees[invsee].handle && (invsees[invsee].type === 'uiitem' || (!config.PlaceholderSlot.includes(sourceSlot) && !config.PlaceholderSlot.includes(destinationSlot)))) {
            invsees[invsee].handle = true;
            switch (actionType) {
                case 'Take': // 拿
                case 'Place': // 放
                case 'Swap': // 交换
                    const source = getItem(player, sourceContainerNetId, sourceSlot), destination = getItem(player, destinationContainerNetId, destinationSlot), itemBak = source.item.clone();
                    if (source.item.isNull() && destination.item.isNull()) break;
                    if (source.item.match(destination.item)) {
                        destination.item.setNbt(destination.item.getNbt().setByte('Count', destination.item.getNbt().getData('Count') + count));
                        source.item.setNbt(source.item.getNbt().setByte('Count', source.item.getNbt().getData('Count') - count));
                        source.update();
                        destination.update();
                        break;
                    }
                    source.set(destination);
                    destination.set(itemBak);
                    break;
                case 'Drop': // 丢
                    const item = getItem(player, sourceContainerNetId, sourceSlot), nbt = item.item.getNbt();
                    nbt.setByte('Count', nbt.getData('Count') - count);
                    item.item.setNbt(nbt);
                    item.update();
                    const item2 = item.item.clone(), nbt2 = item2.getNbt();
                    nbt2.setByte('Count', count);
                    item2.setNbt(nbt2);
                    player.dropItem(item2);
                    break;
                default:
                    player.sendToast(tr('plugin.invsee.chest.toast.title', player.langCode), tr('plugin.invsee.chest.toast.action.error', player.langCode, actionType));
                    break;
            }
            setTimeout(() => updateInvsee(player), 5);
            setTimeout(() => invsees[invsee].handle = false, 10);
        }
    });
});
mc.listen('onInventoryChange', (player) => {
    if (!Object.keys(invsees).some(invsee => invsees[invsee].uuid === player.uuid)) return;
    Object.keys(invsees).forEach(invsee => {
        if (invsees[invsee].refrsh) return;
        invsees[invsee].refrsh = true;
        updateInvsee(Minecraft.getPlayerFromUuid(invsee));
        setTimeout(() => invsees[invsee].refrsh = false, 10);
    });
});

/**
 * @param {Player} player
 * @param {string} uuid 
 * @param {'inventory'|'enderchest'|'uiitem'} type
 */
function startInvsee(player, uuid, type) {
    invsees[player.uuid] = {
        'type': type,
        'uuid': uuid,
        'containerPos': [
            player.blockPos.add(0, 3, 0),
            type !== 'enderchest' ? player.blockPos.add(1, 3, 0) : null
        ],
        'refrsh': false,
        'handle': false
    };
    player.sendUpdateBlockPacket(invsees[player.uuid].containerPos[0], 'minecraft:chest');
    if (invsees[player.uuid].containerPos[1]) player.sendUpdateBlockPacket(invsees[player.uuid].containerPos[1], 'minecraft:chest');
    const nbt = new NbtCompound({
        'Findable': new NbtByte(0),
        'id': new NbtString('Chest'),
        'isMovable': new NbtByte(1),
        'x': new NbtInt(invsees[player.uuid].containerPos[0].x),
        'y': new NbtInt(invsees[player.uuid].containerPos[0].y),
        'z': new NbtInt(invsees[player.uuid].containerPos[0].z),
        'CustomName': new NbtString(tr(`plugin.invsee.chest.${invsees[player.uuid].type}.title`, null, UserCache.getNameByUuid(invsees[player.uuid].uuid))),
        'pairx': new NbtInt(invsees[player.uuid].containerPos[1]?.x ?? 0),
        'pairz': new NbtInt(invsees[player.uuid].containerPos[1]?.z ?? 0),
        'pairlead': new NbtByte(1)
    });
    player.sendBlockActorDataPacket(invsees[player.uuid].containerPos[0], nbt);
    if (invsees[player.uuid].containerPos[1]) {
        nbt.setInt('x', invsees[player.uuid].containerPos[1].x);
        nbt.setInt('pairx', invsees[player.uuid].containerPos[0].x);
        nbt.setByte('pairlead', 0);
        player.sendBlockActorDataPacket(invsees[player.uuid].containerPos[1], nbt);
    }
    setTimeout(() => {
        player.sendOpenContainerPacket(invsees[player.uuid].containerPos[0]);
        updateInvsee(player);
    }, 100);
}

/**
 * @param {Player} player
 */
function updateInvsee(player) {
    setTimeout(() => {
        for (let index = ({ 'enderchest': 26, 'uiitem': 53, 'inventory': 35 })[invsees[player.uuid].type]; index >= 0; index--)
            player.sendInventorySlotPacket(
                ContainerID,
                index,
                new OffLineItem(
                    invsees[player.uuid].uuid,
                    ({
                        'enderchest': 'EnderChestInventory',
                        'uiitem': 'PlayerUIItems',
                        'inventory': 'Inventory'
                    })[invsees[player.uuid].type],
                    index
                ).item
            );
        if (invsees[player.uuid].type !== 'inventory') return;
        config.PlaceholderSlot.forEach(slot =>
            player.sendInventorySlotPacket(ContainerID, slot, mc.newItem(NBT.parseSNBT(config.PlaceholderItem)))
        );
        for (let index = 0; index < 4; index++)
            player.sendInventorySlotPacket(ContainerID, 45 + index, new OffLineItem(invsees[player.uuid].uuid, 'Armor', index).item);
        player.sendInventorySlotPacket(ContainerID, 50, new OffLineItem(invsees[player.uuid].uuid, 'Offhand',).item);
        player.sendInventorySlotPacket(ContainerID, 52, new OffLineItem(invsees[player.uuid].uuid, 'PlayerUIItems').item);
    }, 1);
}

class GUI {
    constructor() {
        throw Error('This class is static!');
    }

    /**
     * @param {Player} player 
     */
    static main(player) {
        const form = mc.newSimpleForm();
        form.setTitle(tr('form.main.title', player.langCode));
        form.setContent(tr('form.main.content', player.langCode));
        form.addButton(tr('form.main.checkOnline', player.langCode));
        form.addButton(tr('form.main.checkAll', player.langCode));
        form.addButton(tr('form.main.searchPlayer', player.langCode));
        player.sendForm(form, (player, id) => {
            switch (id) {
                case 0: return GUI.checkForm(player, mc.getOnlinePlayers().filter(player2 => !player2.isSimulatedPlayer()).map(player => ({ 'Name': player.realName, 'Uuid': player.uuid })));
                case 1: return GUI.checkForm(player, UserCache.getAllPlayerInfo());
                case 2: return GUI.searchPlayerForm(player);
            }
        });
    }

    /**
     * @param {Player} player 
     * @param {string} uuid 
     * @param {function} fun
     * @param {string} param
     */
    static checkPlayerForm(player, uuid, fun, playerList) {
        const form = mc.newSimpleForm();
        form.setTitle(tr('form.checkPlayer.title', player.langCode));
        form.setContent(tr('form.checkPlayer.content', player.langCode, UserCache.getNameByUuid(uuid)));
        form.addButton(tr('form.checkPlayer.back', player.langCode));
        form.addButton(tr('form.checkPlayer.inventory', player.langCode));
        form.addButton(tr('form.checkPlayer.endchest', player.langCode));
        form.addButton(tr('form.checkPlayer.uiitem', player.langCode));
        player.sendForm(form, (player, id) => {
            switch (id) {
                case 0: return fun(player, playerList);
                case 1:
                case 2:
                case 3: return player.runcmd(`${config.command.command} "${UserCache.getNameByUuid(uuid)}" ${['inventory', 'enderchest', 'uiitem'][id - 1]}`);
            }
        });
    }

    /**
     * @param {Player} player
     * @param {Array.<{'Name':string,'Uuid':string}>} playerList
     * @param {function} fun
     */
    static checkForm(player, playerList, fun = GUI.main, params) {
        const form = mc.newSimpleForm();
        form.setTitle(tr('form.checkList.title', player.langCode));
        form.setContent(tr('form.checkList.content', player.langCode));
        form.addButton(tr('form.checkList.back', player.langCode));
        playerList.forEach(info => form.addButton(tr('form.checkList.button', player.langCode, info.Name)));
        player.sendForm(form, (player, id) => {
            if (id === 0) return fun(player, params);
            if (id !== undefined) GUI.checkPlayerForm(player, playerList[id - 1].Uuid, GUI.checkForm, playerList);
        });
    }

    /**
     * @param {Player} player 
     */
    static searchPlayerForm(player, defaultParam = ['', 'i']) {
        const form = mc.newCustomForm();
        form.setTitle(tr('form.searchPlayer.title', player.langCode));
        form.addLabel(tr('form.searchPlayer.description', player.langCode));
        form.addInput(tr('form.searchPlayer.name.input', player.langCode), tr('form.searchPlayer.name.placeholder', player.langCode), defaultParam[0]);
        form.addInput(tr('form.searchPlayer.mode.input', player.langCode), tr('form.searchPlayer.mode.placeholder', player.langCode), defaultParam[1]);
        player.sendForm(form, (player, data) => {
            if (!data) return GUI.main(player);
            GUI.checkForm(player, UserCache.getAllPlayerInfo().filter(info => new RegExp(data[1], data[2]).test(info.Name)), GUI.searchPlayerForm, [data[1], data[2]]);
        });
    }
}

class OffLineItem {
    /** @type {Item} */
    item;
    /** @type {string} */
    uuid;
    /** @type {'Armor'|'Inventory'|'EnderChestInventory'|'PlayerUIItems'|'Offhand'} */
    position;
    /** @type {number} */
    slot;

    /**
     * @param {string} uuid 
     * @param {'Armor'|'Inventory'|'EnderChestInventory'|'PlayerUIItems'|'Offhand'} position 
     * @param {number} [slot=0] 
     */
    constructor(uuid, position, slot = 0) {
        if (!Minecraft.hasPlayerNbt(uuid)) throw Error('Player not found!');
        this.uuid = uuid;
        this.slot = slot;
        this.position = position;
        this.item = position === 'PlayerUIItems' ? (() => {
            const nbt = Minecraft.getPlayerNbt(uuid).getTag(position);
            for (let index = 0; index < nbt.getSize(); index++)
                if (nbt.getTag(index).getData('Slot') === slot)
                    return mc.newItem(nbt.getTag(index));
            return mc.newItem('minecraft:air', 0);
        })() : mc.newItem(Minecraft.getPlayerNbt(uuid).getTag(position).getTag(slot));
    }

    update() {
        if (!Minecraft.hasPlayerNbt(this.uuid)) throw Error('Player not found!');
        const player = mc.getPlayer(UserCache.getXuidByUuid(this.uuid));
        if (player && this.position === 'PlayerUIItems') {
            player.setPlayerUIItem(this.slot, this.item);
            player.sendInventorySlotPacket(124, this.slot, this.item);
        } else {
            const nbt = Minecraft.getPlayerNbt(this.uuid);
            if (this.position === 'PlayerUIItems') {
                for (let index = -1; index < nbt.getTag('PlayerUIItems').getSize(); index++)
                    if (nbt.getTag('PlayerUIItems').getTag(index).getData('Slot') === slot) {
                        if (this.item.isNull()) nbt.getTag('PlayerUIItems').removeTag(index);
                        else nbt.getTag('PlayerUIItems').setTag(index, this.item.getNbt().setByte('Slot', this.slot));
                        break;
                    }
                if (!this.item.isNull()) nbt.getTag('PlayerUIItems').addTag(this.item.getNbt().setByte('Slot', this.slot));
            } else {
                nbt.getTag(this.position).setTag(this.slot, this.item.getNbt().setByte('Slot', this.slot));
            }
            Minecraft.setPlayerNbt(this.uuid, nbt);
        }
        if (player && this.position === 'Inventory') player.sendInventorySlotPacket(0, this.slot, this.item);
    }

    /**
     * @param {Item|OffLineItem} Item 
     */
    set(item) {
        this.item = item?.item ?? item;
        this.update();
    }
}

LLSE_Player.prototype.sendOpenContainerPacket =
    /**
     * 发送打开容器数据包
     * @param {IntPos} pos 容器坐标
     * @param {number} [containerId=ContainerID] 容器会话唯一ID
     * @param {number} [type=0] 容器类型
     * @param {number} [id=-1] 容器的实体UniqueId
     */
    function (
        pos,
        containerId = ContainerID,
        type =/* ContainerType::Container */0,
        EntityUniqueId =/* ActorUniqueID */-1
    ) {
        if (pos.toIntPos) pos = pos.toIntPos();
        const bs = new BinaryStream();
        bs.writeByte(Number(containerId));
        bs.writeByte(Number(type));
        bs.writeVarInt(pos.x);
        bs.writeUnsignedVarInt(pos.y);
        bs.writeVarInt(pos.z);
        bs.writeVarInt64(Number(EntityUniqueId));
        this.sendPacket(bs.createPacket(/* MinecraftPacketIds::ContainerOpen */0x2E));
    }

LLSE_Player.prototype.sendCloseContainerPacket =
    /**
     * 发送关闭容器数据包
     * @param {number} [containerId=ContainerID] 容器会话唯一ID
     * @param {number} [containerType=0x0] 容器类型
     * @param {boolean} [serverInitiatedClose=true] 由服务端关闭
     */
    function (
        containerId = ContainerID,
        containerType = /* ContainerType::Container */0x0,
        serverInitiatedClose = true
    ) {
        const bs = new BinaryStream();
        bs.writeByte(Number(containerId));
        bs.writeByte(Number(containerType));
        bs.writeBool(Boolean(serverInitiatedClose));
        this.sendPacket(bs.createPacket(/* MinecraftPacketIds::ContainerClose */0x2F));
    }

LLSE_Player.prototype.sendUpdateBlockPacket =
    /**
     * 发送更新方块数据包
     * @param {IntPos|FloatPos} pos 方块坐标
     * @param {number|string} runtimeId 方块的runtimeId或命名空间ID
     * @param {number} [layer=0] 方块数据层
     * @param {number} [updateFlags=0] 更新类型
     */
    function (
        pos,
        runtimeId,
        layer =/* UpdateBlockPacket::BlockLayer::Standard */0,
        updateFlags =/* BlockUpdateFlag::None */0
    ) {
        if (pos.toIntPos) pos = pos.toIntPos();
        const bs = new BinaryStream();
        bs.writeVarInt(pos.x);
        bs.writeUnsignedVarInt(pos.y);
        bs.writeVarInt(pos.z);
        bs.writeUnsignedVarInt(typeof runtimeId === 'string' ? Minecraft.getBlockRuntimeId(runtimeId) : Number(runtimeId));
        bs.writeUnsignedVarInt(Number(layer));
        bs.writeUnsignedVarInt(Number(updateFlags));
        this.sendPacket(bs.createPacket(/* MinecraftPacketIds::UpdateBlock */0x15));
    }

LLSE_Player.prototype.sendBlockActorDataPacket =
    /**
     * 发送方块实体数据数据包
     * @param {IntPos} pos 容器坐标
     * @param {NbtCompound} nbt 方块的实体NBT
     */
    function (pos, nbt) {
        if (pos.toIntPos) pos = pos.toIntPos();
        const bs = new BinaryStream();
        bs.writeVarInt(pos.x);
        bs.writeUnsignedVarInt(pos.y);
        bs.writeVarInt(pos.z);
        bs.writeCompoundTag(nbt ?? new NbtCompound());
        this.sendPacket(bs.createPacket(/* MinecraftPacketIds::BlockActorData */0x38));
    }

IntPos.prototype.add = function (x, y, z) {
    return new IntPos(this.x + x, this.y + y, this.z + z, this.dimid);
}
FloatPos.prototype.add = function (x, y, z) {
    return new FloatPos(this.x + x, this.y + y, this.z + z, this.dimid);
}
FloatPos.prototype.toIntPos = function () {
    return new IntPos(Math.floor(this.x), Math.ceil(this.y), Math.floor(this.z), this.dimid);
}
IntPos.prototype.toFloatPos = function () {
    return new FloatPos(this.x, this.y, this.z, this.dimid);
}