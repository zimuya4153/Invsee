#pragma once
#include "Config.h"
#include "Global.h"

namespace Invsee {

class Entry {

public:
    static std::unique_ptr<Entry>& getInstance();

    Entry(ll::plugin::NativePlugin& self) : mSelf(self) {}

    [[nodiscard]] ll::plugin::NativePlugin& getSelf() const { return mSelf; }

    /// @return True if the plugin is loaded successfully.
    bool load();

    /// @return True if the plugin is enabled successfully.
    bool enable();

    /// @return True if the plugin is disabled successfully.
    bool disable();

    // TODO: Implement this method if you need to unload the plugin.
    // /// @return True if the plugin is unloaded successfully.
    bool unload();

    Config& getConfig();

    bool loadConfig();

    bool saveConfig();

    GMLIB::Files::I18n::LangI18n& getI18n();

private:
    ll::plugin::NativePlugin& mSelf;
    std::optional<GMLIB::Files::I18n::LangI18n>   mI18n;
    std::optional<Config>     mConfig;
};

} // namespace Invsee