#include <cstdio>

enum class Weapon { Sword, Bow, Staff };

int damage(Weapon w) {
    switch (w) {
        case Weapon::Sword: return 10;
        case Weapon::Bow: return 6;
    }
    return 0;
}

int main() {
    std::printf("%d\n", damage(Weapon::Staff));
}
