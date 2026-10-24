#include <cstdio>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::string> names;
    names.push_back("ada");
    std::vector<std::string> kept = std::move(names);
    std::printf("%zu %zu\n", kept.size(), names.size());
}
