#include <cstdio>
#include <string_view>

struct Player {
    std::string_view name;
    int health = 100;
};

Player* find(Player (&players)[2], std::string_view name) {
    for (Player& p : players) {
        if (p.name == name) return &p;
    }
    return nullptr;
}

int main() {
    Player players[2] = {{"ada"}, {"bob"}};
    Player* p = find(players, "eve");
    std::printf("%d\n", p->health);
}
