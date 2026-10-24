#include <cstdio>

enum class SaveError { None, DiskFull };

SaveError save(const char* name) {
    if (name[0] == '\0') return SaveError::DiskFull;
    return SaveError::None;
}

int main() {
    save("slot1");
    std::puts("saved");
}
