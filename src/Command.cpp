#include "Entry.h"
#include "Global.h"

struct CommandParam {
    std::string playerName;
    enum class Action { inventory, enderchest, uiitem } action;
};

void registerCommands() {
    auto  config = Invsee::Entry::getInstance()->getConfig();
    auto& cmd    = ll::command::CommandRegistrar::getInstance().getOrCreateCommand(
        config.command.command,
        tr("command.invsee.desc"),
        (CommandPermissionLevel)config.command.permLevel
    );
    if (!config.command.alias.empty()) {
        cmd.alias(std::string_view(config.command.alias));
    }
    cmd.overload<CommandParam>()
        .required("playerName")
        .optional("action")
        .execute([&](CommandOrigin const& origin, CommandOutput& output, CommandParam const& results) {});
}