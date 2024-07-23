#include "Entry.h"
#include "Global.h"
#include "Language.h"

ll::Logger logger(PLUGIN_NAME);

namespace Invsee {

std::unique_ptr<Entry>& Entry::getInstance() {
    static std::unique_ptr<Entry> instance;
    return instance;
}

bool Entry::load() { return true; }

bool Entry::enable() {
    mConfig.emplace();
    if (!loadConfig()) {
        saveConfig();
    }
    mI18n.emplace(getSelf().getLangDir(), getConfig().language);
    mI18n->updateOrCreateLanguage("zh_CN", zh_CN);
    mI18n->loadAllLanguages();
    mI18n->setDefaultLanguage("zh_CN");
    registerCommands();
    return true;
}

bool Entry::disable() {
    mI18n.reset();
    mConfig.reset();
    return true;
}

bool Entry::unload() {
    getInstance().reset();
    return true;
}

bool Entry::loadConfig() { return ll::config::loadConfig(*mConfig, getSelf().getConfigDir() / u8"config.json"); }

bool Entry::saveConfig() { return ll::config::saveConfig(*mConfig, getSelf().getConfigDir() / u8"config.json"); }

Config& Entry::getConfig() { return mConfig.value(); }

GMLIB::Files::I18n::LangI18n& Entry::getI18n() { return mI18n.value(); }

} // namespace Invsee

LL_REGISTER_PLUGIN(Invsee::Entry, Invsee::Entry::getInstance());

std::string tr(std::string const& key, std::string const& language, std::vector<std::string> const& params) {
    return Invsee::Entry::getInstance()->getI18n().get(key, language, params);
}