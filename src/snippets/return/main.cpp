#include <cstdio>

int sign(int x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
}

int main() {
    std::printf("%d\n", sign(0));
}
