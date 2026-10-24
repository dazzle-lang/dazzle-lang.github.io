#include <climits>
#include <cstdio>

bool wraps(int x) {
    return x + 1 < x;
}

int main() {
    std::printf("%s\n", wraps(INT_MAX) ? "true" : "false");
}
