#include <cstdio>

struct Player {
    int health = 100;
    int score;
};

int main() {
    int count;
    Player p;
    count += 1;
    std::printf("%d %d %d\n", count, p.health, p.score);
}
