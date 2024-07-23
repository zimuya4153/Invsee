#pragma once
#include <include_all.h>

#define PLUGIN_NAME "Invsee"

extern ll::Logger logger;

extern void registerCommands();

extern std::string tr(std::string const& key, std::vector<std::string> const& params = {});