#pragma once
#include <iostream>

struct Config {
    int         version  = 1;       // 配置文件版本
    std::string language = "zh_CN"; // 默认语言
    struct {
        std::string typeName = "minecraft:gray_stained_glass_pane"; // 物品命名空间ID
        int         aux      = 0;                                   // 物品特殊值
        std::string nbt      = "";                                  // 物品NBT(如留空则采用命名空间ID)
    } placeholderItem;                                              // 占位物品
    struct {
        std::string command   = "invsee"; // 命令
        std::string alias     = "";       // 命令别名
        int         permLevel = 1;        // 权限等级
    } command;                            // 命令配置
};