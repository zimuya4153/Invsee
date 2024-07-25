# Invsee - 箱子查包

## 描述
Invsee是一款为Minecraft Bedrock服务端提供的LeviLamina版查包插件，使得管理员能以箱子GUI的形式操作玩家的背包。   
此插件采用BSD开源协议，意味着您可以自由地使用、修改和再分发软件源代码，包括将其作为商业产品销售，前提为保留原作者的版权信息。

## 安装方法

- 手动安装
  - 前往[Releases](https://github.com/zimuya4153/Invsee/releases)下载最新版本的`Invsee.zip`
  - 解压`压缩包内的`文件夹到`./plugins/`目录
- Lip 安装
  - 输入命令`lip install -y github.com/zimuya4153/Invsee`
- ~~一条龙安装~~
  - ~~去 Q 群，喊人，帮你安装~~

## 指令
- `/invsee` - 打开GUI界面
- `/invsee <玩家名>` - 编辑玩家背包
- `/invsee <玩家名> <inventory|endchest|uiitem>` - 编辑玩家的背包/末影箱/UI栏

## 优点
- 实时更新
- 不会替换自己的背包
- 可以查询离线玩家

## 缺点
- 无法查询假人
- 无法像真正的容器一样操作(部分功能暂未实现)
- 时不时出现以下报错(如您知道解决办法,请联系QQ:1756150362)
```log
03:57:35.469 ERROR [legacy-script-engine-quickjs] Error occurred in Engine Message Loop!
03:57:35.469 ERROR [legacy-script-engine-quickjs] Uncaught Exception Detected!
```

## 配置文件
```js
{
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
}
```